# myno (@akairos/myno)

> 🎨 WeChat article WYSIWYG editor & visual typography studio.

`myno` 是面向微信公众号文章的所见即所得编辑器引擎与现代排版工作台。基于 `@milkdown/crepe` 封装，集成 `@akairos/milkdown-article-plugins`，统一维护正文 CSS、默认主题变量与微信导出样式。

## 生态与使用者

| 项目 | 与 myno 的关系 |
| --- | --- |
| [zzhub-pipeline](https://github.com/k7airos/zzhub-pipeline) · [`@akairos/pipeline`](https://www.npmjs.com/package/@akairos/pipeline) | 从 0.19.0 起可选安装 myno，通过 `plugins.markdownRenderer` 使用本包的排版和工作台资源，负责浏览器运行、文件输出和草稿发布 |
| [Milkdown Article Plugins](https://github.com/k7airos/milkdown-article-plugins) | myno 的直接依赖，提供扩展语法、输入转换、Markdown 序列化和微信组件渲染 |
| [Milkdown Article Style](https://github.com/k7airos/milkdown-article-style) | 旧版兼容包；从 myno 0.3.1 起，正文 CSS 与默认主题变量收归 myno |
| [Typeset Studio](https://github.com/k7airos/typeset-studio) | 配套的封面、卡片和多页 PNG 设计器，可与 myno 同时作为 Pipeline 插件；两者互不依赖 |
| [Kairos Skills](https://github.com/k7airos/kairos-skills) | 供 Agent 使用的写作语法与发布编排说明 |

Nezus 写作编辑器也是现有消费方，通过 `@akairos/myno/editor` 封装 Vue 接线。自己的 Web 应用也可直接复用该入口，无需安装 Pipeline；仅需调样式和复制文章时使用下面的独立工作台即可。

## 特色能力

- **排版工作台**：提供预设风格套系与配色，支持字号、行距、主色与 H2 风格快速调节。
- **斜杠菜单 (`/`)**：一键插入导读卡片 (`[!INTRO]`)、文末互动卡片 (`[!CTA]`)、5 种标准提示卡片 (`[!NOTE]` ~ `[!CAUTION]`) 与状态徽章。
- **选区气泡工具栏**：划词浮现格式工具，支持文章专属高亮、按键、徽章标记。
- **双模实时同步**：所见即所得编辑与 Markdown 源码模式无缝双向互转。
- **多配置与独立排版文件管理**：完整支持 `wechat-style.json` 独立排版配置的导入、导出与切换。

## 安装

```bash
bun add @akairos/myno
# 或 npm / pnpm
npm install @akairos/myno
```

在自己的编辑器应用中使用时，还需提供同一套兼容的 `@milkdown/crepe`、`@milkdown/kit`（peer dependencies，当前范围 `^7.21.2`），避免重复的 Milkdown/ProseMirror 实例。

```ts
import { MynoEditor } from "@akairos/myno/editor";

const editor = new MynoEditor({
  root: document.getElementById("editor")!,
  defaultValue: "## 开始写作\n\n正文内容。",
  onMarkdownChange: markdown => console.log(markdown),
});
await editor.create();
// 页面卸载时调用 await editor.destroy()
```

`uploadImage` 由宿主注入上传函数；`plugins`、`featureConfigs`、`onCreated` 用于宿主扩展。`styleConfig` / `applyStyleConfig()` 接收 `editorVars`、`exportTheme` 和 `syntaxPresets`，不代表支持完整导出配置中的自定义 CSS 或页首结构。Node 测试只测菜单时使用 `@akairos/myno/menu`，避免编辑器 CSS 导入。

### 仅复用正文样式

```ts
import "@akairos/myno/tokens-default.css";
import "@akairos/myno/article.css";
// 或一次加载两者：import "@akairos/myno/style";
```

以上为纯 CSS 入口，不加载编辑器 JavaScript。样式源文件位于 `src/styles/`，编辑器、Studio 和导出共用。表格表头保持单行，超出正文宽度时左右滚动，正文单元格允许换行。更新 CSS 后需重建 myno；Pipeline 内置导出也需更新依赖并重建浏览器资源。

## 图片描述与缩放

从 0.4.0 起，独立图片的描述性 `alt`、`title` 图注和缩放分别保存在图片节点上。同一 URL 可以出现多次并保留各自描述、图注及顺序。既有 `![0.50](image.png "图注")` 数值 alt 仍表示原有缩放比例。

描述性 alt 图片默认比例为 1，不增加标记；用户缩放后使用紧邻该图片的有限元数据，标记和图片之间固定一个空行：

```md
<!-- myno-image-ratio:v1 0.50 -->

![图片描述](image.png "图注")
```

仅精确 v1 标记、有限正数且非 1 的两位小数比例，以及紧邻的独立描述性图片会被消费。普通注释、未知版本、无效比例或隔有正文的标记保持原样；不按 URL 关联图片。编辑器、Studio 和微信导出共用解析规则，有效元数据不显示到正文。其他 Markdown 渲染器忽略注释时仍保留图片和描述，可能不应用该缩放。

## 独立启动工作台

下面的命令在克隆本仓库后执行，npm 包没有独立 Studio CLI：

```bash
git clone https://github.com/k7airos/myno.git
cd myno
bun install
bun run dev
```

浏览器打开 `http://localhost:5173/src/studio/studio.html`。

工作台无需 pipeline 即可启动：本地默认主题、语法说明和示例正文随包提供，可调样式、导入/导出 JSON 配置，并一键复制富文本到公众号。独立模式隐藏账号保存和历史记录，样式通过「导出配置」保存；「重置」恢复本地默认样式。

当 `/api/studio/config` 可用时，优先采用 pipeline 的账号配置；账号保存和历史记录随之启用，「重置」恢复当前账号配置。接口失败时仍可使用本地模式，并显示配置未加载提示。浏览器剪贴板需允许复制权限，推荐在 localhost 或 HTTPS 页面使用。

## Pipeline 插件

从 0.3.0 起提供 `@akairos/myno/adapter`。插件仅提供本包构建的排版工作台和浏览器端排版入口，工作台支持调样式、导出 config。Chrome 启动、超时和 HTML 文件输出由 pipeline 现有运行时管理。myno 不携带浏览器自动化依赖，不启动浏览器或独立 HTTP 服务。

在 Pipeline 配置中启用 npm 入口：

```json
{
  "plugins": {
    "markdownRenderer": {
      "module": "@akairos/myno/adapter",
      "options": {}
    }
  }
}
```

Pipeline 0.19.0 起将 myno 作为可选依赖提供；省略可选依赖安装时，可自行安装到 Pipeline 可解析的依赖目录。源码联调先执行 `bun run build`，再把 `module` 指向本仓库 `dist/adapter.js` 的绝对路径。

```bash
zzp wechat-preview studio
zzp wechat-export --markdown ./article.md --out ./article.html --no-preview
```

- `doctor()` 仅检查本包浏览器资源是否齐全。
- `browser()` 返回 `{ scriptPath }`，由 pipeline 现有 Chrome 导出运行时加载。Markdown 读取、样式校验、本地图片、输出文件和预览文件由宿主处理。
- `studio()` 返回 `{ root, entry }`，由 pipeline 在 `/studio` 提供页面，并将静态资源挂到 `/studio-assets/`。账号配置读写和历史记录接口由 pipeline 提供。

在支持该契约的 pipeline 中，`wechat-export`、公众号文章发布和 `wechat-preview studio` 使用同一个已配置插件；未配置插件仍使用 pipeline 原有实现。更新排版实现后需重建并更新插件包；仅调整样式时导出 config 即可。
