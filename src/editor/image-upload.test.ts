import type { PluginView, Transaction } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import assert from "node:assert/strict";
import { test } from "bun:test";
import { Schema } from "@milkdown/kit/prose/model";
import { EditorState } from "@milkdown/kit/prose/state";
import { createDataImageUploadPlugin, dataImageFile } from "./image-upload";

const src = "data:image/png;base64,aGVsbG8=";
const url = "https://img.nezus.cn/test.png";
const schema = new Schema({
  nodes: {
    "doc": { content: "block+" },
    "paragraph": { group: "block", content: "inline*" },
    "text": { group: "inline" },
    "image": { group: "inline", inline: true, attrs: { src: {}, alt: { default: "" } } },
    "image-block": { group: "block", attrs: { src: {}, caption: { default: "" }, ratio: { default: 1 } } },
    "code_block": { group: "block", content: "text*", code: true },
  },
});
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("uploads parsed inline/block images once, preserving text, attributes and current positions", async () => {
  const file = await dataImageFile(src);
  assert.equal(file.type, "image/png");
  assert.equal(await file.text(), "hello");
  await assert.rejects(dataImageFile("data:text/html;base64,aGVsbG8="));

  let finish!: (value: string) => void;
  let calls = 0;
  let lifecycle!: PluginView;
  const plugin = createDataImageUploadPlugin(async () => {
    calls++;
    return new Promise<string>((resolve) => {
      finish = resolve;
    });
  }, () => false);
  const view = {
    editable: true,
    state: EditorState.create({ schema, doc: schema.node("doc", null, [
      schema.node("paragraph", null, [schema.node("image", { src, alt: "说明" })]),
      schema.node("image-block", { src, caption: "图注", ratio: 0.5 }),
      schema.node("code_block", null, schema.text(`![example](${src})`)),
    ]) }),
    dispatch(tr: Transaction) {
      const previous = this.state;
      this.state = this.state.apply(tr);
      lifecycle.update?.(this as unknown as EditorView, previous);
    },
  };
  lifecycle = plugin.spec.view!(view as unknown as EditorView);
  await tick();
  assert.equal(calls, 1);
  view.dispatch(view.state.tr.insert(0, schema.node("paragraph", null, schema.text("继续写作"))));
  finish(url);
  await tick();
  assert.equal(calls, 1);
  assert.equal(view.state.doc.child(1).firstChild!.attrs.src, url);
  assert.equal(view.state.doc.child(1).firstChild!.attrs.alt, "说明");
  assert.deepEqual({ ...view.state.doc.child(2).attrs }, { src: url, caption: "图注", ratio: 0.5 });
  assert.equal(view.state.doc.child(3).textContent, `![example](${src})`);
  lifecycle.destroy?.();
});

test("keeps failed images and ignores results after deletion, readonly or destruction", async () => {
  for (const action of ["failure", "delete", "readonly", "destroy", "initial-readonly"]) {
    let readonly = action === "initial-readonly";
    let finish!: (value: string) => void;
    let fail!: (reason: Error) => void;
    let calls = 0;
    const plugin = createDataImageUploadPlugin(() => {
      calls++;
      return new Promise<string>((resolve, reject) => {
        finish = resolve;
        fail = reject;
      });
    }, () => readonly);
    const view = {
      editable: true,
      state: EditorState.create({ schema, doc: schema.node("doc", null, [schema.node("image-block", { src })]) }),
      dispatch() { assert.fail(`unexpected dispatch: ${action}`); },
    };
    const lifecycle = plugin.spec.view!(view as unknown as EditorView);
    await tick();
    if (action === "initial-readonly") {
      assert.equal(calls, 0);
    } else {
      if (action === "delete")
        view.state = view.state.apply(view.state.tr.delete(0, view.state.doc.content.size));
      if (action === "readonly")
        readonly = true;
      if (action === "destroy")
        lifecycle.destroy?.();
      if (action === "failure")
        fail(new Error("upload failed"));
      else
        finish(url);
      await tick();
      if (action !== "delete")
        assert.equal(view.state.doc.firstChild!.attrs.src, src);
      assert.equal(calls, 1);
    }
    lifecycle.destroy?.();
  }
});
