import { describe, expect, test } from "bun:test";
import { getCombinedWechatRenderers } from "@akairos/milkdown-article-plugins";
import { createWechatRendererRegistry, type WechatElementRenderer } from "./wechat-renderer";

describe("wechat element renderer selectors", () => {
  test("uses only simple selectors that every DOM implementation matches alike", () => {
    const renderers = [
      ...createWechatRendererRegistry(),
      ...(getCombinedWechatRenderers() as unknown as WechatElementRenderer[]),
    ];
    for (const renderer of renderers) {
      for (const selector of [renderer.selector, renderer.finalizeSelector].filter(Boolean)) {
        expect(`${renderer.kind}: ${selector}`).not.toMatch(/:(not|has|is|where)\(/);
      }
    }
  });

  test("leaves code inside code blocks to the code-block renderer", async () => {
    const inlineCode = createWechatRendererRegistry().find((renderer) => renderer.kind === "inline-code")!;
    const element = (insidePre: boolean) => ({
      dataset: {} as Record<string, string>,
      closest: (selector: string) => (selector === "pre" && insidePre ? {} : null),
    }) as unknown as HTMLElement;
    const blockCode = element(true);
    const inlineNode = element(false);
    await inlineCode.prepare!(blockCode, {} as never);
    await inlineCode.prepare!(inlineNode, {} as never);
    expect(blockCode.dataset.wechatNode).toBeUndefined();
    expect(inlineNode.dataset.wechatNode).toBe("inline-code");
  });
});
