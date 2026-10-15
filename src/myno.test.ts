import { describe, expect, test } from "bun:test";
import { STYLE_PACKS } from "./studio/style-packs";
import { SYNTAX_CATEGORIES, buildCombinedPresetsCss } from "./studio/syntax-presets";
import { buildWechatThemeCss, getWechatPreviewTheme } from "./studio/themes";
import { parseStyleConfig, exportStyleConfigBlob } from "./studio/config-manager";
import { inlineItems, articleBlockMenu, articleInlineToolbar } from "./editor/article-menu";

describe("myno syntax presets", () => {
  test("emits default preset css for every category", () => {
    const css = buildCombinedPresetsCss({});
    for (const cat of SYNTAX_CATEGORIES) {
      const fallback = cat.presets.find((p) => p.id === cat.defaultPresetId) ?? cat.presets[0];
      expect(css).toContain(fallback.css.trim());
    }
  });

  test("honors selection and falls back to first preset on unknown id", () => {
    expect(buildCombinedPresetsCss({ h2: "bottom-line" })).toContain("padding-bottom: 0.45em");
    expect(buildCombinedPresetsCss({ h2: "no-such-preset" })).toContain("padding-left: 9px");
  });

  test("merges partial export theme config onto default base", () => {
    const theme = getWechatPreviewTheme("default", { editorVars: { "--brand": "#123456" }, exportTheme: { bodyFontSize: "16px" } });
    const css = buildWechatThemeCss({ "--brand": "#123456" }, theme.exportTheme);
    expect(css).toContain("--wx-brand-accent: #123456");
    expect(css).toContain("font-size: 16px");
    // 未覆盖字段回落默认主题
    expect(theme.exportTheme.h2Color).toBeDefined();
  });
});

describe("myno style packs", () => {
  test("defines curated style packs", () => {
    expect(STYLE_PACKS.length).toBeGreaterThanOrEqual(6);
    for (const pack of STYLE_PACKS) {
      expect(pack.id).toBeDefined();
      expect(pack.name).toBeDefined();
      expect(pack.swatch.length).toBeGreaterThanOrEqual(3);
      expect(pack.theme.fontSize).toBeDefined();
      expect(pack.theme.brandColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("myno config manager", () => {
  test("parses valid standalone JSON", () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      engineVersion: 1,
      id: "my-style",
      name: "My Style",
      version: "1.0.0",
      exportTheme: { bodyFontSize: "17px" },
      editorVars: { "--brand": "#123456" },
      syntaxPresets: { h2: "contrast-green" },
    });
    const result = parseStyleConfig(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    expect(result.config.id).toBe("my-style");
    expect(result.config.exportTheme.bodyFontSize).toBe("17px");
    expect(result.config.editorVars["--brand"]).toBe("#123456");
  });

  test("generates downloadable blob export", () => {
    const config = {
      schemaVersion: 1,
      engineVersion: 1,
      id: "custom-export",
      name: "Custom Export",
      version: "1.0.0",
      editorVars: { "--brand": "#ca6093" },
      exportTheme: { bodyFontSize: "16px" },
    };
    const { url, filename } = exportStyleConfigBlob(config);
    expect(url).toBeDefined();
    expect(filename).toBe("custom-export.json");
  });
});

describe("myno editor menu specifications", () => {
  test("inline items include highlight, kbd and badges", () => {
    expect(inlineItems.length).toBeGreaterThanOrEqual(7);
    const keys = inlineItems.map((i) => i.key);
    expect(keys).toContain("highlight");
    expect(keys).toContain("kbd");
    expect(keys).toContain("badge-brand");
    expect(keys).toContain("badge-success");
  });

  test("registers block menu with article cards and callouts", () => {
    const registered: any[] = [];
    articleBlockMenu({
      addGroup: (_key: string, label: string) => {
        expect(label).toBe("文章组件");
        return {
          addItem: (k: string, item: any) => {
            registered.push({ key: k, ...item });
          },
        };
      },
    } as any);

    const keys = registered.map((r) => r.key);
    expect(keys).toContain("intro");
    expect(keys).toContain("cta");
    expect(keys).toContain("note");
    expect(keys).toContain("tip");
    expect(keys).toContain("important");
    expect(keys).toContain("warning");
    expect(keys).toContain("caution");
    expect(keys).toContain("highlight");
  });

  test("registers inline toolbar", () => {
    const toolbarItems: any[] = [];
    articleInlineToolbar({
      addGroup: (_key: string, label: string) => {
        expect(label).toBe("行内组件");
        return {
          addItem: (k: string, item: any) => {
            toolbarItems.push({ key: k, ...item });
          },
        };
      },
    } as any);

    expect(toolbarItems.length).toBeGreaterThanOrEqual(7);
    const itemKeys = toolbarItems.map((i) => i.key);
    expect(itemKeys).toContain("highlight");
    expect(itemKeys).toContain("kbd");
    expect(itemKeys).toContain("badge-brand");
    expect(itemKeys).toContain("badge-success");
    expect(itemKeys).toContain("badge-warning");
    expect(itemKeys).toContain("badge-danger");
    expect(itemKeys).toContain("badge-info");
  });
});
