import { Crepe } from "@milkdown/crepe";
import type { CrepeConfig } from "@milkdown/crepe";
import type { MilkdownPlugin } from "@milkdown/kit/ctx";
import { uploadConfig } from "@milkdown/kit/plugin/upload";
import { $prose } from "@milkdown/kit/utils";
import { getCombinedMilkdownPlugins } from "@akairos/milkdown-article-plugins";
import {
  articleBlockMenu,
  articleInlineToolbar,
  articleInlineTopBar,
  getEditorView,
  getParser,
} from "./article-menu";
import { createDataImageUploadPlugin, dataImageFile } from "./image-upload";
import { imageMarkdownPlugins } from "./image-markdown";
// 各语法类目的默认预设（h2 呼吸柱、引用样式等）是 myno 的默认观感，随编辑器一起生效；
// studio 等宿主若在运行时注入自己的预设 CSS，后注入者按文档顺序覆盖这里的默认。
import type { MynoStyleConfig } from "../style-config";
import { buildEditorStyleCss, hasExternalStyleResource, observeCalloutTitles } from "./style-config-css";

import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import "../styles/tokens-default.css";
import "../styles/article.css";

export interface MynoEditorOptions {
  root: HTMLElement;
  defaultValue?: string;
  readonly?: boolean;
  placeholder?: string;
  onMarkdownChange?: (markdown: string) => void;
  /** 图片上传由调用方注入（COS/本地/自建均可），返回最终 URL；不传则图片保持原样。 */
  uploadImage?: (file: File) => Promise<string>;
  /** 追加的 milkdown 插件（如 emoji、frontmatter），在文章插件之后加载。 */
  plugins?: MilkdownPlugin[];
  /** 覆盖/追加 Crepe featureConfigs，键冲突时覆盖内置默认。 */
  featureConfigs?: CrepeConfig["featureConfigs"];
  /** create 完成后的逃生舱（可拿到 Crepe 实例做进一步定制）。 */
  onCreated?: (crepe: Crepe) => void | Promise<void>;
  /**
   * 排版 config（studio 导出的那套 JSON 的核心字段）：选中预设替换默认、主题变量覆盖观感。
   * 结构上兼容 parseStyleConfig 的结果——多余字段忽略；运行时更新用 applyStyleConfig()。
   */
  styleConfig?: Partial<MynoStyleConfig>;
}

let editorStyleSequence = 0;

export class MynoEditor {
  private crepe: Crepe | null = null;
  private options: MynoEditorOptions;
  private isDestroyed = false;
  // 每个编辑器拥有独立 CSS 作用域，多个文章或宿主控件互不覆盖。
  private styleScope = `myno-style-${++editorStyleSequence}`;
  private styleTag: HTMLStyleElement | null = null;
  private headerImage: HTMLImageElement | null = null;
  private footer: HTMLElement | null = null;
  private stopCalloutObservation: (() => void) | null = null;

  constructor(options: MynoEditorOptions) {
    this.options = options;
  }

  async create(): Promise<Crepe> {
    const { root, defaultValue = "", readonly = false, placeholder = "输入内容，或输入 / 快速插入文章组件...", uploadImage, plugins, featureConfigs, onCreated, styleConfig } = this.options;

    this.applyStyleConfig(styleConfig);

    const crepe = new Crepe({
      root,
      defaultValue,
      features: readonly
        ? {
            [Crepe.Feature.BlockEdit]: false,
            [Crepe.Feature.LinkTooltip]: false,
            [Crepe.Feature.Toolbar]: false,
            [Crepe.Feature.TopBar]: false,
          }
        : undefined,
      featureConfigs: {
        [Crepe.Feature.BlockEdit]: {
          buildMenu: articleBlockMenu,
        },
        [Crepe.Feature.Toolbar]: {
          buildToolbar: articleInlineToolbar,
        },
        [Crepe.Feature.TopBar]: {
          buildTopBar: articleInlineTopBar,
        },
        placeholder: {
          text: placeholder,
          mode: "doc",
        },
        ...(uploadImage ? { [Crepe.Feature.ImageBlock]: { onUpload: uploadImage } } : {}),
        ...featureConfigs,
      },
    });

    crepe.editor.use(getCombinedMilkdownPlugins());
    for (const plugin of plugins ?? []) {
      crepe.editor.use(plugin);
    }
    // Crepe 先把独立图片转为 image-block，再统一缺失的 title，网络加载不参与解析。
    crepe.editor.use(imageMarkdownPlugins);
    if (uploadImage) {
      // 粘贴/旧正文里的 base64 图片统一走调用方的上传入口回写 URL
      crepe.editor.use($prose(() =>
        createDataImageUploadPlugin(async (src) => uploadImage(await dataImageFile(src)), () => false),
      ));
    }

    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown) => {
        if (!this.isDestroyed && this.options.onMarkdownChange) {
          this.options.onMarkdownChange(markdown);
        }
      });
    });

    await crepe.create();
    if (uploadImage) {
      // 允许从剪贴板 HTML 中携带的图片文件触发上传
      crepe.editor.action((ctx) => {
        ctx.update(uploadConfig.key, (prev) => ({ ...prev, enableHtmlFileUploader: true }));
      });
    }
    crepe.setReadonly(readonly);
    await onCreated?.(crepe);

    crepe.editor.action((ctx) => {
      const view = getEditorView(ctx);
      if (view?.dom) {
        view.dom.classList.add("zzhub-wechat-article");
      }
    });

    this.crepe = crepe;
    this.stopCalloutObservation = observeCalloutTitles(root);
    this.applyStyleConfig(this.options.styleConfig);
    return crepe;
  }

  /** 运行时更新排版样式（config 异步加载完成后调用；undefined = 回到出厂默认）。 */
  applyStyleConfig(styleConfig?: MynoEditorOptions["styleConfig"]) {
    this.options.styleConfig = styleConfig;
    this.options.root.classList.add(this.styleScope);
    if (!this.styleTag) {
      this.styleTag = document.createElement("style");
      document.head.appendChild(this.styleTag);
    }
    this.styleTag.textContent = buildEditorStyleCss(styleConfig, `.${this.styleScope}`);
    if (!this.crepe) return;
    // 装饰节点放在可编辑正文之外，不能回写到 Markdown。
    const header = styleConfig?.structure?.headerImageUrl;
    if (header && /^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(header)) {
      this.headerImage ??= document.createElement("img");
      this.headerImage.src = header;
      this.headerImage.alt = "文章顶部图片";
      this.headerImage.style.cssText = "display:block;width:100%;height:auto;margin-bottom:24px";
      this.options.root.prepend(this.headerImage);
    } else { this.headerImage?.remove(); this.headerImage = null; }
    const footerText = styleConfig?.exportTheme?.footerText;
    if (footerText) {
      this.footer ??= document.createElement("div");
      this.footer.textContent = footerText;
      const footerStyle = styleConfig?.exportTheme?.footerStyle ?? "";
      this.footer.style.cssText = hasExternalStyleResource(footerStyle) ? "" : footerStyle;
      this.options.root.append(this.footer);
    } else { this.footer?.remove(); this.footer = null; }
  }

  getMarkdown(): string {
    if (!this.crepe) return this.options.defaultValue || "";
    return this.crepe.getMarkdown();
  }

  setMarkdown(markdown: string) {
    if (!this.crepe) return;
    this.crepe.editor.action((ctx) => {
      const view = getEditorView(ctx);
      const parser = getParser(ctx);
      if (!view || !parser) return;
      const doc = parser(markdown);
      if (!doc) return;
      const { state } = view;
      const tr = state.tr.replaceWith(0, state.doc.content.size, doc.content);
      view.dispatch(tr);
    });
  }

  setReadonly(readonly: boolean) {
    this.crepe?.setReadonly(readonly);
  }

  getCrepe(): Crepe | null {
    return this.crepe;
  }

  async destroy() {
    this.isDestroyed = true;
    this.stopCalloutObservation?.();
    this.stopCalloutObservation = null;
    this.styleTag?.remove();
    this.styleTag = null;
    this.headerImage?.remove(); this.headerImage = null;
    this.footer?.remove(); this.footer = null;
    this.options.root.classList.remove(this.styleScope);
    if (this.crepe) {
      await this.crepe.destroy();
      this.crepe = null;
    }
  }
}
