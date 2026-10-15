# myno 维护与接入

更新日期：2026-10-15。当前 npm 基线 `@akairos/myno@0.3.0`，配套 Pipeline `0.19.0`。使用说明与公开生态入口见 [README](README.md)。本文记录当前边界，旧会话的测试数和临时服务地址不代表当前环境。

## 已交付

- `src/editor/myno-editor.ts` 提供 `MynoEditor`，支持 `uploadImage`、`plugins`、`featureConfigs`、`onCreated` 和 `styleConfig`。
- `src/editor/image-upload.ts` 处理粘贴/已有正文中的 Data URL 图片；上传厂商由宿主注入。
- 默认语法预设随编辑器加载；`applyStyleConfig()` 接受 `editorVars`、`exportTheme`、`syntaxPresets`。完整导出 JSON 中的自定义 CSS、页首结构不属于这个插槽。
- `src/studio/studio-config.ts` 提供本地默认、语法说明和示例；编辑器先初始化，宿主配置成功后优先采用。迟到配置不覆盖已写正文。
- 独立模式保留调样式、导入/导出、富文本复制和本地重置，隐藏账号保存/历史。Pipeline 模式沿用宿主账号配置和保存接口。
- `src/adapter.ts` 的 `browser()` / `studio()` 只返回包内资源路径；Pipeline 负责 Chrome、超时、文件输出与发布。本包没有 Playwright、Puppeteer 或浏览器启动逻辑。

## 分发与消费方

- npm `exports`：根入口、`./editor`、`./menu`、`./style`、`./adapter`，以 `package.json` 为准。
- `bun run build` 先输出 TS 库，再构建 Studio 和 `editor-export.js`。运行时不从邻近源码目录拷贝资源。
- Pipeline 0.19.0 可选依赖 myno 0.3.0，需显式配置 `plugins.markdownRenderer`；未启用时仍有内置实现。不要声称已经删除 Pipeline 全部历史副本。
- Nezus 当前源码的写作组件使用 `@akairos/myno/editor`，清单范围仍为 `^0.2.4`；不同消费方独立升级，不因本包发布就自动升级。
- 公共基础依赖为 [语法插件](https://github.com/k7airos/milkdown-article-plugins) 与 [正文 CSS](https://github.com/k7airos/milkdown-article-style)；封面/贴图使用配套的 [Typeset Studio](https://github.com/k7airos/typeset-studio)，两者互不依赖。

## 使用与检查

```bash
bun install
bun run dev
# 打开 http://localhost:5173/src/studio/studio.html
bun run build
bun test src/adapter.test.ts src/myno.test.ts
```

Vite 将 `/api` 代理到本机 18765；没有 Pipeline 时也能进入独立模式。库接入的 `@milkdown/*` 是 peer dependencies，宿主必须使用兼容的单份实例。无 CSS loader 的 Node 测试需要菜单时用 `@akairos/myno/menu`。

2026-10-15 已完成构建、定向检查、独立/宿主 Studio 行为检查，以及 Pipeline 生产 myno 路径的微信草稿创建和回读。这是发布时证据，后续变更需按影响范围重新验证。

## 尚未完成

Nezus 的 `styleConfig` prop 和 watch 已存在，尚未接入配置读取源。后续方向是业务后端读取接口，再向编辑器传配置；不要把这个计划描述成已有接口，也不要把账号凭据传给编辑器。
