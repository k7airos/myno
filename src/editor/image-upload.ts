import { Plugin } from "@milkdown/kit/prose/state";

/** 将内嵌图片转成文件，复用编辑器现有上传入口。 */
export async function dataImageFile(src: string): Promise<File> {
  const mime = /^data:(image\/(?:png|jpeg|gif|webp));base64,/i.exec(src)?.[1]?.toLowerCase();
  if (!mime)
    throw new Error("仅支持 PNG、JPEG、GIF、WebP 格式的 Base64 图片");
  const blob = await (await fetch(src)).blob();
  return new File([blob], `pasted-image.${mime.split("/")[1]}`, { type: mime });
}

/**
 * 扫描正文中的 base64 图片节点（粘贴或旧正文遗留），逐个交给调用方上传并回写 URL。
 * 上传方式完全由调用方注入，核心库不含任何图床厂商逻辑。
 */
export function createDataImageUploadPlugin(upload: (src: string) => Promise<string>, isReadonly: () => boolean) {
  return new Plugin({
    view(view) {
      // 同一图片只上传一次；失败后保留原图，移除再插入或重开文档可重试。
      const attempted = new Set<string>();
      const pending = new Set<string>();
      let destroyed = false;

      function scan() {
        if (destroyed || isReadonly() || !view.editable)
          return;
        const sources = new Set<string>();
        view.state.doc.descendants((node) => {
          if (["image", "image-block"].includes(node.type.name) && /^data:image\//i.test(node.attrs.src))
            sources.add(node.attrs.src);
        });
        for (const src of attempted) {
          if (!sources.has(src))
            attempted.delete(src);
        }
        for (const src of sources) {
          if (attempted.has(src) || pending.has(src))
            continue;
          attempted.add(src);
          pending.add(src);
          void upload(src).then((url) => {
            if (destroyed || isReadonly() || !view.editable)
              return;
            // 使用最新位置和属性，避免异步上传覆盖后续编辑或复活已删除图片。
            const tr = view.state.tr;
            view.state.doc.descendants((node, pos) => {
              if (["image", "image-block"].includes(node.type.name) && node.attrs.src === src)
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: url });
            });
            if (tr.docChanged)
              view.dispatch(tr);
          }).catch(() => {
            // 上传入口已提示错误，保留正文中的原图供重试。
          }).finally(() => pending.delete(src));
        }
      }

      queueMicrotask(scan);
      return {
        update(_view, previousState) {
          if (previousState.doc !== view.state.doc)
            scan();
        },
        destroy() { destroyed = true; },
      };
    },
  });
}
