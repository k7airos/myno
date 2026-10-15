import { expect, test } from "bun:test";
import { Schema } from "@milkdown/kit/prose/model";
import { remarkImageTitles } from "./image-markdown";

// 固定 7.21.2 的属性约束，不依赖本地较新 Milkdown 是否已放宽解析。
const schema = new Schema({ nodes: {
  doc: { content: "block+" },
  text: { group: "inline" },
  image: { group: "inline", inline: true, attrs: { src: { default: "", validate: "string" }, alt: { default: "", validate: "string" }, title: { default: "", validate: "string" } } },
  "image-block": { group: "block", attrs: { src: { default: "", validate: "string" }, caption: { default: "", validate: "string" }, ratio: { default: 1, validate: "number" } } },
} });

test("normalizes missing inline/block titles while preserving URLs, captions and surrounding content", () => {
  const image = { type: "image", url: "https://unreachable.invalid/no-cors.png", alt: "持久图片", title: null as string | null };
  const block = { type: "image-block", url: "https://unreachable.invalid/block.png", alt: "0.50", title: null as string | null };
  const titled = { type: "image", url: "https://unreachable.invalid/titled.png", alt: "保留说明", title: "已有图注" };
  const missing = { type: "image", url: "https://unreachable.invalid/missing.png", alt: "说明", title: undefined as string | undefined };
  const text = { type: "text", value: "前后正文" };
  const tree = { type: "root", children: [{ type: "paragraph", children: [text, image, titled, missing] }, block] };
  expect(() => schema.nodes["image-block"]!.create({ src: block.url, caption: block.title, ratio: 1 })).toThrow();
  remarkImageTitles()(tree);
  expect(image.title).toBe(""); expect(block.title).toBe(""); expect(missing.title).toBe(""); expect(titled.title).toBe("已有图注");
  expect(tree.children[0]!.children![0]).toBe(text);
  expect(schema.nodes.image!.create({ src: image.url, alt: image.alt, title: image.title }).attrs.src).toBe(image.url);
  expect(schema.nodes["image-block"]!.create({ src: block.url, caption: block.title, ratio: 0.5 }).attrs).toMatchObject({ src: block.url, caption: "", ratio: 0.5 });
  expect(image.alt).toBe("持久图片"); expect(block.alt).toBe("0.50"); expect(titled.url).toBe("https://unreachable.invalid/titled.png");
});
