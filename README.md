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
bun run dev
```

浏览器打开 `http://localhost:5173/src/studio/studio.html`。
