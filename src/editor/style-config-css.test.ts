import { expect, test } from "bun:test";
import { calloutTitleOverrides, hasExternalStyleResource } from "./style-config-css";

test("callout configured title and icon follow renderer's independent override branches", () => {
  expect(calloutTitleOverrides("")).toEqual({ title: false, icon: false });
  expect(calloutTitleOverrides("  ")).toEqual({ title: false, icon: false });
  expect(calloutTitleOverrides("自定义标题")).toEqual({ title: true, icon: false });
  expect(calloutTitleOverrides("✨ 自定义标题")).toEqual({ title: true, icon: true });
  expect(calloutTitleOverrides("✨")).toEqual({ title: false, icon: true });
  expect(calloutTitleOverrides("⚠️  ")).toEqual({ title: false, icon: true });
});

test("live style rejects resource-loading CSS functions including quoted image-set sources", () => {
  for (const value of [
    'image-set("https://invalid.example/leak" 1x)',
    '-webkit-image-set("https://invalid.example/leak" 1x)',
    'image/**/-set("https://invalid.example/leak" 1x)',
    'image("https://invalid.example/leak")',
    'src("https://invalid.example/leak")',
    'url("https://invalid.example/leak")',
  ]) expect(hasExternalStyleResource(value)).toBe(true);
  expect(hasExternalStyleResource("linear-gradient(90deg, #fff, #eee)")).toBe(false);
});
