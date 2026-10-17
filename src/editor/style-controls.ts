import {
  STYLE_PACKS, COLOR_PALETTES, SYNTAX_CATEGORIES,
  normalizeStyleConfig, applyStylePack, applyColorPalette, brandTint,
  parseStyleConfig, exportStyleConfigBlob,
  type MynoStyleConfig,
} from "../style-config";
import { CALLOUT_PRESETS } from "@akairos/milkdown-article-plugins";

export interface StyleControlsOptions {
  value?: Partial<MynoStyleConfig>;
  disabled?: boolean;
  onChange: (value: MynoStyleConfig) => void;
}

/** 可嵌入宿主的完整排版控件；不创建编辑器、不读取账号、不调用网络。 */
export function mountStyleControls(root: HTMLElement, options: StyleControlsOptions) {
  let value = normalizeStyleConfig(options.value);
  let disabled = options.disabled ?? false;
  let destroyed = false;
  const form = document.createElement("fieldset");
  form.className = "myno-style-controls";
  form.style.cssText = "display:grid;gap:16px;border:0;padding:0;margin:0;min-width:0";
  root.append(form);

  function emit(next: MynoStyleConfig, redraw = false) {
    value = next;
    if (redraw) render();
    options.onChange(next);
  }

  function group(title: string) {
    const section = document.createElement("details");
    section.open = true;
    const summary = document.createElement("summary");
    summary.textContent = title;
    summary.style.cssText = "font-weight:600;cursor:pointer;margin-bottom:10px";
    const content = document.createElement("div");
    content.style.cssText = "display:grid;gap:10px;min-width:0";
    section.append(summary, content);
    form.append(section);
    return content;
  }

  function field(parent: HTMLElement, label: string, control: HTMLElement) {
    const wrapper = document.createElement("label");
    wrapper.style.cssText = "display:grid;gap:5px;min-width:0;font-size:13px";
    wrapper.append(document.createTextNode(label), control);
    control.classList.add(control instanceof HTMLSelectElement ? "vercel-select" : "vercel-input");
    control.style.maxWidth = "100%";
    control.setAttribute("aria-label", label);
    parent.append(wrapper);
    return control;
  }

  function text(parent: HTMLElement, label: string, initial: string, onInput: (text: string) => void, multiline = false) {
    const input = multiline ? document.createElement("textarea") : document.createElement("input");
    input.value = initial;
    if (input instanceof HTMLTextAreaElement) input.rows = 4;
    input.addEventListener("input", () => onInput(input.value));
    field(parent, label, input);
    return input;
  }

  function select(parent: HTMLElement, label: string, items: { id: string; name: string }[], selected: string, onSelect: (id: string) => void) {
    const control = document.createElement("select");
    for (const item of items) control.add(new Option(item.name, item.id));
    if (selected && !items.some(item => item.id === selected)) {
      control.add(new Option(`${selected}（原配置；未注册，沿用默认视觉）`, selected));
    }
    control.value = selected;
    control.addEventListener("change", () => onSelect(control.value));
    field(parent, label, control);
    return control;
  }

  function setTheme(key: string, next: string) {
    emit({ ...value, exportTheme: { ...value.exportTheme, [key]: next } });
  }

  function render() {
    form.replaceChildren();
    form.disabled = disabled;
    const presets = group("整套预设与配色");
    select(presets, "整套排版预设", [{ id: "", name: "选择预设" }, ...STYLE_PACKS], "", id => {
      const pack = STYLE_PACKS.find(item => item.id === id);
      if (pack) emit(applyStylePack(value, pack), true);
    });
    select(presets, "推荐调色盘", [{ id: "", name: "选择调色盘" }, ...COLOR_PALETTES], "", id => {
      const palette = COLOR_PALETTES.find(item => item.id === id);
      if (palette) emit(applyColorPalette(value, palette), true);
    });

    const typography = group("字体与间距");
    const numbers = [
      ["bodyFontSize", "正文字号（px）", 12, 32, 1, "px", "16"],
      ["bodyLineHeight", "正文行高", 1, 3, 0.01, "", "1.84"],
      ["bodyLetterSpacing", "字间距（em）", 0, 0.2, 0.001, "em", "0.012"],
      ["bodyParagraphSpacing", "段落间距（em）", 0, 4, 0.01, "em", "1.18"],
    ] as const;
    for (const [key, label, min, max, step, unit, fallback] of numbers) {
      const input = text(typography, label, String(Number.parseFloat(value.exportTheme[key] ?? fallback)), next => {
        if (next !== "" && Number.isFinite(Number(next))) setTheme(key, `${next}${unit}`);
      }) as HTMLInputElement;
      input.type = "number";
      input.min = String(min); input.max = String(max); input.step = String(step);
    }
    text(typography, "字体族", value.exportTheme.fontFamily ?? "", next => setTheme("fontFamily", next));

    const colors = group("颜色");
    for (const [key, label, variable] of [
      ["primaryColor", "品牌色", "--brand"], ["bodyColor", "正文颜色", "--text"],
      ["h2Color", "二级标题颜色", ""], ["h3Color", "三级标题颜色", ""],
      ["blockquoteBorderColor", "引用强调色", ""], ["dividerColor", "分割线颜色", "--divider"],
      ["mutedColor", "弱化文字颜色", "--text-soft"],
    ] as const) {
      text(colors, label, value.exportTheme[key] ?? value.editorVars[variable] ?? "", next => {
        const editorVars = { ...value.editorVars, ...(variable ? { [variable]: next } : {}) };
        const tint = key === "primaryColor" ? brandTint(next, 0.08) : null;
        if (tint) {
          editorVars["--brand-bg"] = tint;
          editorVars["--brand-bg-deep"] = brandTint(next, 0.12)!;
        }
        emit({ ...value, editorVars, exportTheme: { ...value.exportTheme, [key]: next } });
      });
    }

    const syntax = group("语法节点预设");
    for (const category of SYNTAX_CATEGORIES) {
      select(syntax, category.label, category.presets, value.syntaxPresets[category.key] ?? category.defaultPresetId,
        id => emit({ ...value, syntaxPresets: { ...value.syntaxPresets, [category.key]: id } }));
    }

    const structure = group("文章结构");
    const numbered = document.createElement("input");
    numbered.type = "checkbox";
    numbered.checked = !!value.structure.numberedHeadings;
    numbered.addEventListener("change", () => emit({ ...value, structure: { ...value.structure, numberedHeadings: numbered.checked } }));
    field(structure, "二级标题自动编号", numbered);
    for (const [key, label] of [["headingLabel", "标题前缀"], ["quoteLabel", "引用标签"], ["headerImageUrl", "文章顶部图片（Data URL）"]] as const) {
      text(structure, label, value.structure[key] ?? "", next => emit({ ...value, structure: { ...value.structure, [key]: key === "headerImageUrl" && !next ? null : next } }));
    }
    const structureTip = document.createElement("small");
    structureTip.textContent = "编号和标签只改变显示，正文 Markdown 保持原样；最终以完整预览为准。";
    structure.append(structureTip);

    const callouts = group("提示块默认标签");
    for (const [kind, preset] of Object.entries(CALLOUT_PRESETS)) {
      for (const [key, label] of [["title", "标题"], ["icon", "图标"]] as const) {
        text(callouts, `${preset.title} · ${label}`, value.structure.calloutPresets?.[kind]?.[key] ?? preset[key], next => emit({
          ...value, structure: { ...value.structure, calloutPresets: {
            ...value.structure.calloutPresets, [kind]: { ...value.structure.calloutPresets?.[kind], [key]: next },
          } },
        }));
      }
    }

    const advanced = group("署名与高级样式");
    for (const [key, label] of [["footerText", "文末署名"], ["footerStyle", "文末署名样式"], ["containerStyle", "正文容器样式"]] as const) {
      text(advanced, label, value.exportTheme[key] ?? "", next => setTheme(key, next), key !== "footerText");
    }
    text(advanced, "自定义 CSS（仅文章范围）", value.css, next => emit({ ...value, css: next }), true);

    const transfer = group("配置导入与导出");
    const error = document.createElement("p");
    error.setAttribute("role", "alert");
    error.hidden = true;
    const file = document.createElement("input");
    file.type = "file"; file.accept = ".json,application/json";
    file.addEventListener("change", async () => {
      const selected = file.files?.[0];
      if (!selected) return;
      try {
        const parsed = parseStyleConfig(await selected.text());
        if (!parsed.ok) throw new Error(parsed.error);
        if (destroyed) return;
        emit(normalizeStyleConfig(parsed.config), true);
      } catch (err) {
        error.textContent = `导入失败：${(err as Error).message}`;
        error.hidden = false;
      }
    });
    field(transfer, "导入 myno 排版 JSON", file);
    const download = document.createElement("button");
    download.type = "button"; download.className = "vercel-btn"; download.textContent = "导出排版 JSON";
    download.addEventListener("click", () => {
      const result = exportStyleConfigBlob({ schemaVersion: 1, engineVersion: 1, id: "wechat-style", name: "myno 排版配置", version: "1.0.0", ...value });
      const link = document.createElement("a");
      link.href = result.url; link.download = result.filename; link.click();
      setTimeout(() => URL.revokeObjectURL(result.url), 1000);
    });
    transfer.append(download, error);
  }

  render();
  return {
    update(next: Partial<MynoStyleConfig>, nextDisabled = disabled) {
      const normalized = normalizeStyleConfig(next);
      disabled = nextDisabled;
      if (JSON.stringify(normalized) !== JSON.stringify(value)) { value = normalized; render(); }
      form.disabled = disabled;
    },
    destroy() { destroyed = true; form.remove(); },
  };
}
