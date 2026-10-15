import { $remark } from "@milkdown/kit/utils";
import { imageBlockSchema } from "@milkdown/kit/component/image-block";

interface MarkdownNode {
  type?: string;
  title?: string | null;
  alt?: string | null;
  value?: string;
  mynoImageRatio?: number;
  children?: MarkdownNode[];
}

function descriptiveAlt(alt: unknown): alt is string {
  return typeof alt === "string" && !!alt.length && Number.isNaN(Number(alt));
}

function imageRatioComment(node: MarkdownNode): number | null {
  const html = node.type === "html" ? node : node.type === "paragraph" && node.children?.length === 1 && node.children[0]?.type === "html" ? node.children[0] : null;
  const match = /^<!-- myno-image-ratio:v1 ((?:0|[1-9]\d*)\.\d{2}) -->$/.exec(html?.value ?? "");
  if (!match) return null;
  const ratio = Number(match[1]);
  return Number.isFinite(ratio) && ratio > 0 && ratio !== 1 ? ratio : null;
}

/** remark 用 null 表示缺少 title，Milkdown 7.21 的图片属性只接受字符串。 */
export function remarkImageTitles() {
  return (tree: MarkdownNode) => {
    const visit = (node: MarkdownNode) => {
      if ((node.type === "image" || node.type === "image-block") && node.title == null) node.title = "";
      const children = node.children;
      if (children) for (let index = 0; index < children.length - 1; index += 1) {
        const ratio = imageRatioComment(children[index]!);
        const next = children[index + 1]!;
        const image = next.type === "image-block" ? next : next.type === "paragraph" && next.children?.length === 1 && next.children[0]?.type === "image" ? next.children[0] : null;
        // 只消费相邻独立描述图的专用标记，不跨正文或按 URL 恢复属性。
        if (ratio === null || !image || !descriptiveAlt(image.alt)) continue;
        children.splice(index, 2, { ...image, type: "image-block", mynoImageRatio: ratio });
        index -= 1;
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

const imageDescriptionSchema = imageBlockSchema.extendSchema(previous => ctx => {
  const schema = previous(ctx);
  return {
    ...schema,
    attrs: { ...schema.attrs, alt: { default: null, validate: "string|null" } },
    parseMarkdown: {
      ...schema.parseMarkdown,
      runner: (state, node, type) => {
        const alt = descriptiveAlt(node.alt) ? node.alt : null;
        let ratio = alt === null ? Number(node.alt || 1) : Number(node.mynoImageRatio ?? 1);
        if (Number.isNaN(ratio) || ratio === 0) ratio = 1;
        state.addNode(type, { src: node.url, caption: node.title ?? "", ratio, alt });
      },
    },
    parseDOM: schema.parseDOM?.map(rule => ({
      ...rule,
      getAttrs: (dom: HTMLElement) => {
        const attrs = rule.getAttrs?.(dom);
        return attrs === false ? false : { ...attrs, alt: descriptiveAlt(dom.getAttribute("alt")) ? dom.getAttribute("alt") : null };
      },
    })),
    toDOM: node => {
      const { alt, ...attrs } = node.attrs;
      if (alt === null) return ["img", { "data-type": "image-block", ...attrs }];
      return ["img", { "data-type": "image-block", ...attrs, alt, title: attrs.caption, ...(attrs.ratio === 1 ? { ratio: undefined } : {}) }];
    },
    toMarkdown: {
      ...schema.toMarkdown,
      runner: (state, node) => {
        if (node.attrs.alt === null) return schema.toMarkdown.runner(state, node);
        const ratio = Number(node.attrs.ratio);
        if (!Number.isFinite(ratio) || ratio <= 0) throw new RangeError("图片缩放比例必须为有限正数");
        const encoded = ratio.toFixed(2);
        if (!/^(?:0|[1-9]\d*)\.\d{2}$/.test(encoded) || Number(encoded) <= 0) throw new RangeError("图片缩放比例无法保存为有效两位小数");
        if (encoded !== "1.00") state.addNode("html", undefined, `<!-- myno-image-ratio:v1 ${encoded} -->`);
        state.openNode("paragraph");
        state.addNode("image", undefined, undefined, { title: node.attrs.caption, url: node.attrs.src, alt: node.attrs.alt });
        state.closeNode();
      },
    },
  };
});

export const imageMarkdownPlugins = [
  $remark("myno-image-titles", () => remarkImageTitles), imageBlockSchema, imageDescriptionSchema,
].flat();
