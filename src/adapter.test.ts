import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import adapter from "./adapter";

test("adapter exposes packaged Studio and browser entries without a browser driver", async () => {
  const studio = await adapter.studio();
  expect(await readFile(join(studio.root, studio.entry), "utf8")).toContain("studio.js");
  expect((await adapter.browser()).scriptPath).toBe(join(studio.root, "editor-export.js"));
  expect(await adapter.doctor()).toEqual([{ name: "myno-browser-assets", ok: true, message: studio.root }]);
});
