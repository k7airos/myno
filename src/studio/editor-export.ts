import { defaultValueCtx, Editor, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { getHTML } from "@milkdown/kit/utils";
import articleCss from "@akairos/milkdown-article-style/article.css?raw";
import { getCombinedMilkdownPlugins } from "@akairos/milkdown-article-plugins";
import { renderWechatHtml, type ArticleStructure } from "./wechat-renderer";
import { buildCombinedPresetsCss } from "./syntax-presets";
import type { WechatExportTheme } from "./themes";

declare global {
  interface Window {
    __ZZHUB_WECHAT_PAYLOAD__: {
      markdown: string;
      assetBaseUrl: string;
      editorVars: Record<string, string>;
      exportTheme: WechatExportTheme;
      syntaxPresets?: Record<string, string>;
      structure?: ArticleStructure;
      customCss?: string;
    };
    __ZZHUB_SET_RESULT__: (result: { status: "success" | "error"; html?: string; semanticHtml?: string; error?: string }) => void;
  }
}

/** 无交互导出入口，与 Studio 共用 myno 的语法、预设和微信渲染器。 */
async function main() {
  const payload = window.__ZZHUB_WECHAT_PAYLOAD__;
  const editor = Editor.make().config(ctx => {
    ctx.set(rootCtx, document.getElementById("editor-host")!);
    ctx.set(defaultValueCtx, payload.markdown);
  }).use(commonmark).use(gfm).use(getCombinedMilkdownPlugins());
  try {
    await editor.create();
    const semantic = new DOMParser().parseFromString(editor.action(getHTML()), "text/html");
    for (const image of semantic.querySelectorAll("img")) {
      const src = image.getAttribute("src") || "";
      if (src && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src)) {
        const url = new URL(src, payload.assetBaseUrl);
        image.src = url.protocol === "file:" ? decodeURIComponent(url.pathname) : url.href;
      }
    }
    const semanticHtml = semantic.body.innerHTML;
    const html = await renderWechatHtml({
      semanticHtml, baseCss: articleCss,
      customCss: [buildCombinedPresetsCss(payload.syntaxPresets ?? {}), payload.customCss].filter(Boolean).join("\n\n"),
      structure: payload.structure, editorVars: payload.editorVars, theme: payload.exportTheme,
    });
    window.__ZZHUB_SET_RESULT__({ status: "success", html, semanticHtml });
  } catch (error) {
    window.__ZZHUB_SET_RESULT__({ status: "error", error: error instanceof Error ? error.message : String(error) });
  } finally {
    await editor.destroy();
  }
}

void main().catch(error => window.__ZZHUB_SET_RESULT__({ status: "error", error: String(error) }));
