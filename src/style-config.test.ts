import { expect, test } from "bun:test";
import { STYLE_PACKS, COLOR_PALETTES, normalizeStyleConfig, applyStylePack, applyColorPalette } from "./style-config";

test("browser-safe config preserves full saved data when changing preset or palette", () => {
  const original = normalizeStyleConfig({
    exportTheme: { bodyFontSize: "15px", footerText: "本人署名", bodyLetterSpacing: "0.03em" },
    syntaxPresets: { h3: "tag-style", blockquote: "left-bar" },
    structure: { headingLabel: "章节", quoteLabel: "引用", headerImageUrl: "data:image/png;base64,YQ==" },
    css: ".milkdown .editor p { text-align: justify; }",
  });
  expect(original.exportTheme.bodyFontSize).toBe("15px");
  expect(original.syntaxPresets.h3).toBe("tag-style");
  const packed = applyStylePack(original, STYLE_PACKS[2]);
  expect(packed.exportTheme.bodyLetterSpacing).toBe(`${STYLE_PACKS[2].theme.letterSpacing}em`);
  expect(packed.structure.numberedHeadings).toBe(true);
  expect(packed.structure.headingLabel).toBe("章节");
  const colored = applyColorPalette(packed, COLOR_PALETTES[0]);
  expect(colored.exportTheme.h2Color).toBe(COLOR_PALETTES[0].colors.h2);
  expect(colored.exportTheme.primaryColor).toBe(COLOR_PALETTES[0].colors.brand);
  expect(colored.exportTheme.footerText).toBe("本人署名");
  expect(colored.css).toBe(original.css);
  expect(colored.structure.headerImageUrl).toBe(original.structure.headerImageUrl);
  expect(original.exportTheme.bodyLetterSpacing).toBe("0.03em");
});
