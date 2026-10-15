# myno (@akairos/myno)

> 🎨 WeChat article WYSIWYG editor & visual typography studio.

`myno` 是面向微信公众号文章的所见即所得编辑器引擎与现代排版工作台。基于 `@milkdown/crepe` 封装，深度集成 `@akairos/milkdown-article-plugins` 与 `@akairos/milkdown-article-style`。

## 特色能力

- **极简专业排版工作台**：告别参数堆叠，提供 6 组大师级精选风格套系（极简纸墨、典雅胭脂、冷灰高雅、薄荷清晨、极光深紫、商业经典），支持字号、行距、主色与 H2 风格快速调节。
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

## 独立启动工作台

```bash
bun install
bun run dev
```

浏览器打开 `http://localhost:5173/src/studio/studio.html`。

工作台无需 pipeline 即可启动：本地默认主题、语法说明和示例正文随包提供，可调样式、导入/导出 JSON 配置，并一键复制富文本到公众号。独立模式隐藏账号保存和历史记录，样式通过「导出配置」保存；「重置」恢复本地默认样式。

当 `/api/studio/config` 可用时，优先采用 pipeline 的账号配置；账号保存和历史记录随之启用，「重置」恢复当前账号配置。接口失败时仍可使用本地模式，并显示配置未加载提示。浏览器剪贴板需允许复制权限，推荐在 localhost 或 HTTPS 页面使用。

## Pipeline 插件

从 0.3.0 起提供 `@akairos/myno/adapter`。插件仅提供本包构建的排版工作台和浏览器端排版入口，工作台支持调样式、导出 config。Chrome 启动、超时和 HTML 文件输出由 pipeline 现有运行时管理。myno 不携带浏览器自动化依赖，不启动浏览器或独立 HTTP 服务。

开发时先执行 `bun run build`，在 pipeline 配置中使用本地构建入口：

```json
{
  "plugins": {
    "markdownRenderer": {
      "module": "/absolute/path/myno/dist/adapter.js",
      "options": {}
    }
  }
}
```

使用 npm 安装时，将入口改为 `@akairos/myno/adapter`。pipeline 0.19.0 起将 myno 作为可选依赖提供，仍需在配置中显式启用；省略可选依赖安装时，可自行安装到 pipeline 可解析的依赖目录。

- `doctor()` 仅检查本包浏览器资源是否齐全。
- `browser()` 返回 `{ scriptPath }`，由 pipeline 现有 Chrome 导出运行时加载。Markdown 读取、样式校验、本地图片、输出文件和预览文件由宿主处理。
- `studio()` 返回 `{ root, entry }`，由 pipeline 在 `/studio` 提供页面，并将静态资源挂到 `/studio-assets/`。账号配置读写和历史记录接口由 pipeline 提供。

在支持该契约的 pipeline 中，`wechat-export`、公众号文章发布和 `wechat-preview studio` 使用同一个已配置插件；未配置插件仍使用 pipeline 原有实现。更新排版实现后需重建并更新插件包；仅调整样式时导出 config 即可。
