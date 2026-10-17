import { getWechatPreviewTheme } from "./studio/themes";
import type { WechatExportTheme } from "./studio/themes";
import type { StandaloneStyleConfig } from "./studio/config-manager";
import type { StylePack } from "./studio/style-packs";
import type { ColorPalette } from "./studio/color-palettes";
import type { ArticleStructure } from "./studio/wechat-renderer";

export { STYLE_PACKS } from "./studio/style-packs";
export { SYNTAX_CATEGORIES } from "./studio/syntax-presets";
export { COLOR_PALETTES } from "./studio/color-palettes";
export { parseStyleConfig, exportStyleConfigBlob } from "./studio/config-manager";
export type { StandaloneStyleConfig, StylePack, ColorPalette, WechatExportTheme };

/** 宿主只传排版数据；账号、网络与正文由宿主保管。 */
export interface MynoStyleConfig {
  editorVars: Record<string, string>;
  exportTheme: Partial<WechatExportTheme> | Record<string, string | undefined>;
  syntaxPresets: Record<string, string>;
  structure: ArticleStructure;
  css: string;
}

export function normalizeStyleConfig(input?: Partial<MynoStyleConfig>): MynoStyleConfig {
  const theme = getWechatPreviewTheme("default", {
    editorVars: input?.editorVars,
    exportTheme: { footerText: "", bodyFontSize: "16px", bodyParagraphSpacing: "1.18em", ...input?.exportTheme },
  });
  return {
    editorVars: { ...theme.editorVars },
    exportTheme: { ...theme.exportTheme },
    syntaxPresets: { ...input?.syntaxPresets },
    structure: { ...input?.structure },
    css: input?.css ?? "",
  };
}

export function brandTint(hex: string, alpha: number): string | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

export function applyColorPalette(value: MynoStyleConfig, palette: ColorPalette): MynoStyleConfig {
  const colors = palette.colors;
  return {
    ...value,
    editorVars: {
      ...value.editorVars,
      "--brand": colors.brand, "--text": colors.text, "--divider": colors.divider,
      "--brand-bg": brandTint(colors.brand, 0.08)!, "--brand-bg-deep": brandTint(colors.brand, 0.12)!,
    },
    exportTheme: {
      ...value.exportTheme,
      primaryColor: colors.brand, bodyColor: colors.text, h2Color: colors.h2,
      h3Color: colors.h3, blockquoteBorderColor: colors.quote, dividerColor: colors.divider,
    },
  };
}

export function applyStylePack(value: MynoStyleConfig, pack: StylePack): MynoStyleConfig {
  const theme = pack.theme;
  const colored = applyColorPalette(value, { ...pack, category: pack.subtitle, colors: {
    brand: theme.brandColor, text: theme.textColor, h2: theme.h2Color,
    h3: theme.h3Color, quote: theme.quoteColor, divider: theme.dividerColor,
  } });
  return {
    ...colored,
    exportTheme: {
      ...colored.exportTheme, bodyFontSize: `${theme.fontSize}px`, bodyLineHeight: theme.lineHeight,
      bodyLetterSpacing: `${theme.letterSpacing}em`, bodyParagraphSpacing: `${theme.paragraphSpacing}em`,
    },
    syntaxPresets: { ...value.syntaxPresets, h2: theme.h2Preset, h3: theme.h3Preset },
    structure: { ...value.structure, numberedHeadings: theme.numberedHeadings },
  };
}
