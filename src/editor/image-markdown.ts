import { $remark } from "@milkdown/kit/utils";

interface MarkdownNode {
  type?: string;
  title?: string | null;
  children?: MarkdownNode[];
}

/** remark 用 null 表示缺少 title，Milkdown 7.21 的图片属性只接受字符串。 */
export function remarkImageTitles() {
  return (tree: MarkdownNode) => {
    const visit = (node: MarkdownNode) => {
      if ((node.type === "image" || node.type === "image-block") && node.title == null) node.title = "";
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

export const imageMarkdownPlugins = $remark("myno-image-titles", () => remarkImageTitles);
