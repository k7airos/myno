import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import adapter from "./adapter";

test("adapter exposes packaged Studio and browser entries without a browser driver", async () => {
  const studio = await adapter.studio();
  expect(await readFile(join(studio.root, studio.entry), "utf8")).toContain("studio.js");
  expect((await adapter.browser()).scriptPath).toBe(join(studio.root, "editor-export.js"));
  expect(await adapter.doctor()).toEqual([{ name: "myno-browser-assets", ok: true, message: studio.root }]);
});

test("publishes standalone article styles without the legacy style package", async () => {
  const article = await readFile(fileURLToPath(import.meta.resolve("@akairos/myno/article.css")), "utf8");
  expect(article).toContain(".milkdown .editor");
  expect(article).toContain("overflow-x: auto");
  expect(article).toContain("white-space: nowrap");
  const tokens = await readFile(fileURLToPath(import.meta.resolve("@akairos/myno/tokens-default.css")), "utf8");
  expect(tokens).toContain("--wx-body-color");
});
