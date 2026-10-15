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
// 各语法类目的默认预设（h2 呼吸柱、引用样式等）是 myno 的默认观感，随编辑器一起生效；
// studio 等宿主若在运行时注入自己的预设 CSS，后注入者按文档顺序覆盖这里的默认。
import { buildCombinedPresetsCss } from "../studio/syntax-presets";

import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import "@akairos/milkdown-article-style/tokens-default.css";
import "@akairos/milkdown-article-style/article.css";

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
}

export class MynoEditor {
  private crepe: Crepe | null = null;
  private options: MynoEditorOptions;
  private isDestroyed = false;

  constructor(options: MynoEditorOptions) {
    this.options = options;
  }

  async create(): Promise<Crepe> {
    const { root, defaultValue = "", readonly = false, placeholder = "输入内容，或输入 / 快速插入文章组件...", uploadImage, plugins, featureConfigs, onCreated } = this.options;

    let presetStyle = document.getElementById("myno-editor-preset-css") as HTMLStyleElement | null;
    if (!presetStyle) {
      presetStyle = document.createElement("style");
      presetStyle.id = "myno-editor-preset-css";
      document.head.appendChild(presetStyle);
    }
    presetStyle.textContent = buildCombinedPresetsCss({});

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
    return crepe;
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
    if (this.crepe) {
      await this.crepe.destroy();
      this.crepe = null;
    }
  }
}
