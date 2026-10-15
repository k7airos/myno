# Handoff: myno ↔ nezus 编辑器统一集成

更新时间：2026-10-15。前序会话：a626c71b（方案制定 + myno 0.2.0 改造，429 中断）→ 本会话（完成全部落地）。

## 背景与目标

nezus 里有一套平行演化、已行为漂移的 myno 编辑器副本（fork 的菜单、图片上传插件）。
目标：**编辑器内核全部收进 `@akairos/myno`，nezus 只留 Vue 胶水**，消灭三处拷贝（nezus fork / pipeline 手动拷贝）。

## 已完成（全部已 commit，均未 push）

### myno 侧（`@akairos/myno@0.2.4`，已发 npm）

| Commit | 内容 |
|---|---|
| `1df05d2` | `MynoEditor` 四插槽：`uploadImage`（零图床厂商代码）/ `plugins` / `featureConfigs` / `onCreated`；`image-upload.ts` 从 nezus 搬入 + 测试随迁；菜单文案改短；`@milkdown/*` 转 **peerDependencies**；新增 `./menu` 子路径导出（node:test 无法 import CSS side-effect，测试走这条） |
| `296f6b8` | 回合修复 nezus fork 修过的 bug：badge/kbd 应用前须 `removeMark` 全部现有标记，否则 `**[[kbd:…]]**` 嵌套 markdown 往返丢数据（迁移测试抓住的） |
| `0eea766` | 默认语法预设（h2=pillar 呼吸柱等全类目）随 `MynoEditor` 常驻注入 `<style id="myno-editor-preset-css">`，消费方开箱即得 myno 观感 |
| `edd892f` | **`styleConfig` 插槽**：接收 studio config JSON 核心字段（`editorVars`/`exportTheme`/`syntaxPresets`，`parseStyleConfig` 结果直接传也兼容）；`applyStyleConfig()` 运行时更新；`buildWechatThemeCss` 从带 juice 的 wechat-renderer.ts 挪到纯模块 themes.ts |

测试 11 个全过；typecheck/build 干净。

### nezus 侧（`/Users/aatrox/.oh-my-zzhub/core/nezus`）

| Commit | 内容 |
|---|---|
| `2573ca7` | `MilkdownEditor.client.vue` 瘦身为纯 Vue 胶水（保留 markdown 归一化 / `[[` 引用触发 / note:链接拦截 / 上传包装）；删除 fork 的 `milkdown-article-menu.ts`、`milkdown-image-upload.ts` 及其测试；`milkdown-article-plugins.test.ts` 改测 `@akairos/myno/menu` |
| `b854c17` | 依赖升 0.2.3 |
| `1ec2f00` | 依赖升 0.2.4 + `MilkdownEditor` 新增可选 `styleConfig` prop（响应式 watch，config 变化实时生效） |

5 个消费方（CloudNoteWriter / LocalNoteWriter / NoteDetail / NavSiteContent / AssetMarkdownEditor）props 零改动。150 个 desktop 测试过，lint 干净，`nuxt build` 成功。

### 本地环境（今天已验证跑通）

- nezus dev：http://localhost:4782/（`FRONTEND_ONLY=true` 模式，**API 走 akang，不是 nuxt 内部 server**）
- akang-store-server dev：`pnpm dev`（nitro，4783）；其 postgres(15432)/redis(16380) 在 orbstack 容器
- 用户已登录实测：斜杠菜单、行内工具栏正常；h2 样式已对齐（默认预设生效）

## 下一步规划

### 1. config 来源接线（最后一公里，等用户拍板）

`MilkdownEditor` 的 `styleConfig` prop 已就位但**没人喂**。需用户决定 config 从哪读：
- 方案 A：akang-store-server 出读取接口（多端一致，推荐）
- 方案 B：像 pipeline 那样读本地 config 文件
定好后：取 config JSON → `parseStyleConfig`（或直接传）→ `<MilkdownEditor :style-config="…" />`。

### 2. pipeline studio 改 npm 依赖（消灭第三处拷贝）

pipeline 的 wechat-preview studio（18765 端口）目前靠**手动复制 myno 源码**同步。改为 npm 依赖 `@akairos/myno`，与 nezus 同构，之后「只改核心库」即全端生效。涉及 pipeline 仓的 `build:wechat-preview` 产物重建。

### 3. 待用户回归测试的可见变化

- 行内工具栏 3→7 项；行内标记（高亮/kbd/徽章）**再点可取消**（myno 行为统一）
- 斜杠菜单文案变短（「导读卡片 (INTRO)」→「导读」）
- base64 粘贴图片自动走 `uploadImage` 上传回写 URL（失败保留原图可重试）

### 4. 小尾巴

- myno 0.2.x 的 `README`/CHANGELOG 未随插槽 API 更新（低优先级）
- `MynoEditor` 给编辑器 DOM 加 `zzhub-wechat-article` class，无 CSS 作用（仅渲染器标记），nezus 侧无影响，知悉即可
- 两个 dev server 由会话后台托管（4782 nezus / 4783 akang），日志在 `/tmp/nezus-dev.log`、`/tmp/akang-dev.log`，会话结束即停

## 关键约定（已写入记忆 myno-nezus-editor-integration）

- `@milkdown/*` 在 myno 是 peerDeps——消费方必须自带同版本，两份 ProseMirror 实例会出诡异 bug
- node:test 环境 import myno 只能用 `@akairos/myno/menu`（`./editor` 带 CSS import）
- badge/kbd 标记应用前必须清全部现有标记（markdown 往返限制）
- nezus 本地 dev 架构：前端(4782) × akang 后端(4783) × orbstack(pgres/redis)，`FRONTEND_ONLY=true` 是正确配置
