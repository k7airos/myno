import { buildCombinedPresetsCss } from "../studio/syntax-presets";
import { buildWechatThemeCss, getWechatPreviewTheme } from "../studio/themes";
import type { MynoStyleConfig } from "../style-config";
import selectorParser from "postcss-selector-parser";

/** 即时预览也禁止 CSS 资源请求；保存时服务端仍执行权威校验。 */
export function hasExternalStyleResource(value: string): boolean {
  return /\\|@import\b|(?:url|image-set|image|src|expression)\s*\(/i.test(value.replace(/\/\*[\s\S]*?\*\//g, ""));
}

/** 与导出器一致：纯 emoji 标题只覆盖图标，普通自定义标题只覆盖文字。 */
export function calloutTitleOverrides(title: string) {
  const trimmed = title.trim();
  const emoji = trimmed.match(/^((?:(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})\uFE0F?)+)\s*(.*)$/u);
  return { title: emoji ? !!emoji[2].trim() : !!trimmed, icon: !!emoji };
}

/** 仅标记 NodeView 的显示分支，不修改节点文本或正文属性。 */
export function observeCalloutTitles(root: HTMLElement): () => void {
  function update(element: Element) {
    const callouts = [element, ...element.querySelectorAll("[data-callout-type]")];
    for (const callout of callouts) {
      if (!callout.matches("[data-callout-type]")) continue;
      const overrides = calloutTitleOverrides(callout.getAttribute("data-callout-title") ?? "");
      callout.toggleAttribute("data-myno-callout-custom-title", overrides.title);
      callout.toggleAttribute("data-myno-callout-custom-icon", overrides.icon);
    }
  }
  update(root);
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === "attributes") update(record.target as Element);
      else for (const node of record.addedNodes) if (node instanceof Element) update(node);
    }
  });
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-callout-title", "data-callout-type"] });
  return () => observer.disconnect();
}

/** 使用浏览器 CSS parser 递归限定规则，媒体查询里的选择器也不能逃出编辑器。 */
export function scopeStyleCss(css: string, scope: string): string {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  function rules(items: CSSRuleList): string {
    return Array.from(items).map(rule => {
      if (rule instanceof CSSStyleRule) {
        const selectors = selectorParser(selectors => {
          selectors.each(selector => {
            const prefix = selectorParser().astSync(scope).first!;
            selector.prepend(selectorParser.combinator({ value: " " }));
            for (const node of [...prefix.nodes].reverse()) selector.prepend(node.clone());
          });
        }).processSync(rule.selectorText);
        return `${selectors} { ${rule.style.cssText} }`;
      }
      if (rule instanceof CSSMediaRule) return `@media ${rule.conditionText} { ${rules(rule.cssRules)} }`;
      if (rule instanceof CSSSupportsRule) return `@supports ${rule.conditionText} { ${rules(rule.cssRules)} }`;
      return "";
    }).join("\n");
  }
  return rules(sheet.cssRules);
}

export function buildEditorStyleCss(config: Partial<MynoStyleConfig> | undefined, scope: string): string {
  const presets = buildCombinedPresetsCss(config?.syntaxPresets ?? {});
  const hasTheme = config && (Object.keys(config.editorVars ?? {}).length > 0 || Object.keys(config.exportTheme ?? {}).length > 0);
  const safeConfig = hasTheme ? {
    editorVars: Object.fromEntries(Object.entries(config.editorVars ?? {}).filter(([key, value]) => /^--[a-zA-Z0-9_-]+$/.test(key) && !hasExternalStyleResource(value))),
    exportTheme: Object.fromEntries(Object.entries(config.exportTheme ?? {}).filter(([, value]) => typeof value === "string" && !hasExternalStyleResource(value))),
  } : undefined;
  const theme = safeConfig ? buildWechatThemeCss(safeConfig.editorVars, getWechatPreviewTheme("default", safeConfig).exportTheme) : "";
  const structure = config?.structure;
  const label = JSON.stringify(structure?.headingLabel ? `${structure.headingLabel} ` : "");
  const quote = JSON.stringify(structure?.quoteLabel ?? "");
  const decorations = `
    .milkdown .editor { counter-reset: myno-heading; }
    ${structure?.numberedHeadings || structure?.headingLabel ? `.milkdown .editor h2::before {
      ${structure.numberedHeadings ? "counter-increment: myno-heading;" : ""}
      content: ${label} ${structure.numberedHeadings ? 'counter(myno-heading, decimal-leading-zero) " "' : ""};
      margin-right: 0.3em; opacity: 0.7; font-weight: 600;
    }` : ""}
    ${structure?.quoteLabel ? `.milkdown .editor blockquote::before {
      content: ${quote}; display: block; margin-bottom: 6px; font-size: 11px; font-weight: 600;
      letter-spacing: 0.05em; color: var(--wx-brand-ink, var(--wx-brand-accent)); text-transform: uppercase;
    }` : ""}
  `;
  const callouts = Object.entries(structure?.calloutPresets ?? {}).filter(([kind]) => /^[a-z-]+$/.test(kind)).map(([kind, preset]) => {
    return ["title", "icon"].map(key => {
      const text = preset[key as "title" | "icon"];
      const selector = `.milkdown .editor [data-callout-type="${kind}"]:not([data-myno-callout-custom-${key}]) > .wechat-callout-header > .wechat-callout-${key}`;
      // NodeView 标题有内联字号，必须显式覆盖，替换文字与导出器同为 14px。
      return text === undefined ? "" : `${selector} { font-size: 0 !important; }
        ${selector}::after { content: ${JSON.stringify(text)}; font-size: 14px; }`;
    }).join("\n");
  }).join("\n");
  const customCss = config?.css && !hasExternalStyleResource(config.css) ? config.css : "";
  return scopeStyleCss([presets, theme, decorations, callouts, customCss].join("\n"), scope);
}
