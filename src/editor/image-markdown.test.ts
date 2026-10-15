import { expect, test } from "bun:test";
import { Schema } from "@milkdown/kit/prose/model";
import { Clock, Container, Ctx } from "@milkdown/kit/ctx";
import { nodesCtx } from "@milkdown/kit/core";
import type { NodeSchema } from "@milkdown/kit/transformer";
import { imageMarkdownPlugins, remarkImageTitles } from "./image-markdown";

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
  expect((tree.children[0] as { children: unknown[] }).children[0]).toBe(text);
  expect(schema.nodes.image!.create({ src: image.url, alt: image.alt, title: image.title }).attrs.src).toBe(image.url);
  expect(schema.nodes["image-block"]!.create({ src: block.url, caption: block.title, ratio: 0.5 }).attrs).toMatchObject({ src: block.url, caption: "", ratio: 0.5 });
  expect(image.alt).toBe("持久图片"); expect(block.alt).toBe("0.50"); expect(titled.url).toBe("https://unreachable.invalid/titled.png");
});

test("consumes only adjacent v1 ratio comments for individual descriptive images", () => {
  const image = (alt: string) => ({ type: "image-block", url: "https://same.invalid/image.png", alt, title: "图注" });
  const first = image("第一张"), second = image("第二张"), numeric = image("0.50");
  const unknown = { type: "html", value: "<!-- myno-image-ratio:v2 0.50 -->" };
  const invalid = { type: "html", value: "<!-- myno-image-ratio:v1 0.00 -->" };
  const distant = { type: "html", value: "<!-- myno-image-ratio:v1 0.75 -->" };
  const tree = { type: "root", children: [
    { type: "paragraph", children: [{ type: "html", value: "<!-- myno-image-ratio:v1 0.50 -->" }] }, first,
    { type: "html", value: "<!-- myno-image-ratio:v1 1.25 -->" }, second,
    unknown, image("未知版本"), invalid, image("无效比例"), distant,
    { type: "paragraph", children: [{ type: "text", value: "不能跨越正文" }] }, image("隔开图片"),
    { type: "html", value: "<!-- myno-image-ratio:v1 0.25 -->" }, numeric,
  ] };
  remarkImageTitles()(tree);
  expect(tree.children[0]).toMatchObject({ alt: "第一张", mynoImageRatio: 0.5 });
  expect(tree.children[1]).toMatchObject({ alt: "第二张", mynoImageRatio: 1.25 });
  expect(tree.children).toContain(unknown); expect(tree.children).toContain(invalid); expect(tree.children).toContain(distant);
  expect(tree.children.at(-1)).toBe(numeric);
  expect(tree.children.filter(node => node.type === "image-block").map(node => (node as typeof first).alt)).toEqual(["第一张", "第二张", "未知版本", "无效比例", "隔开图片", "0.50"]);
});

test("extended block schema preserves alt and resizing per node while retaining numeric ratio syntax", async () => {
  const ctx = new Ctx(new Container(), new Clock()).inject(nodesCtx, []);
  const schemaPlugins = imageMarkdownPlugins.slice(-2);
  const cleanup: Array<() => void> = [];
  for (const plugin of schemaPlugins) {
    const handler = plugin(ctx);
    const dispose = await handler();
    if (dispose) cleanup.push(dispose);
  }
  try {
    const spec = ctx.get(nodesCtx).find(([name]) => name === "image-block")![1] as NodeSchema;
    const target = new Schema({ nodes: { doc: { content: "block+" }, text: { group: "inline" }, "image-block": spec } });
    const parsed: any[] = [];
    for (const node of [
      { type: "image-block", url: "same.png", alt: "第一张", title: "图注甲", mynoImageRatio: 0.5 },
      { type: "image-block", url: "same.png", alt: "第二张", title: "图注乙" },
      { type: "image-block", url: "legacy.png", alt: "0.50", title: "原数值" },
    ]) spec.parseMarkdown.runner({ addNode: (_type: unknown, attrs: unknown) => parsed.push(attrs) } as any, node, target.nodes["image-block"]!);
    expect(parsed).toEqual([
      { src: "same.png", alt: "第一张", caption: "图注甲", ratio: 0.5 },
      { src: "same.png", alt: "第二张", caption: "图注乙", ratio: 1 },
      { src: "legacy.png", alt: null, caption: "原数值", ratio: 0.5 },
    ]);
    const output: unknown[][] = [];
    const writer = { openNode: (...args: unknown[]) => output.push(["open", ...args]), addNode: (...args: unknown[]) => output.push(["add", ...args]), closeNode: () => output.push(["close"]) };
    for (const attrs of parsed) spec.toMarkdown.runner(writer as any, target.node("image-block", attrs));
    expect(output.filter(row => row[1] === "html")).toEqual([["add", "html", undefined, "<!-- myno-image-ratio:v1 0.50 -->"]]);
    expect(output.filter(row => row[1] === "image").map(row => row.at(-1))).toEqual([
      { title: "图注甲", url: "same.png", alt: "第一张" }, { title: "图注乙", url: "same.png", alt: "第二张" },
      { title: "原数值", url: "legacy.png", alt: "0.50" },
    ]);
    expect(spec.toDOM!(target.node("image-block", parsed[0]))).toMatchObject(["img", { alt: "第一张", ratio: 0.5 }]);
    expect(spec.toDOM!(target.node("image-block", parsed[1]))).toMatchObject(["img", { alt: "第二张", ratio: undefined }]);
    for (const ratio of [Infinity, NaN, 0, -1, 0.001, 1e21]) expect(() => spec.toMarkdown.runner(writer as any, target.node("image-block", { ...parsed[0], ratio }))).toThrow();
  } finally { cleanup.reverse().forEach(dispose => dispose()); }
});
