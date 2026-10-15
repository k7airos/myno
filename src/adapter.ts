import { access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// npm 包仅提供已构建资源，浏览器执行和配置持久化由宿主负责。
const root = fileURLToPath(new URL("../dist/", import.meta.url));

/** pipeline 浏览器排版插件入口，不启动 Chrome 或独立服务。 */
export const mynoAdapter = {
  name: "myno",

  async doctor() {
    try {
      await Promise.all(["editor-export.js", "studio.js", "src/studio/studio.html"].map(file => access(join(root, file))));
      return [{ name: "myno-browser-assets", ok: true, message: root }];
    } catch {
      return [{ name: "myno-browser-assets", ok: false, message: "myno 浏览器资源缺失，请重新安装已构建的包" }];
    }
  },

  /** 浏览器端排版入口，交给 pipeline 现有导出运行时执行。 */
  async browser() {
    const scriptPath = join(root, "editor-export.js");
    await access(scriptPath);
    return { scriptPath };
  },

  /** 工作台资源由宿主挂载，沿用宿主配置读写接口。 */
  async studio() {
    await access(join(root, "src/studio/studio.html"));
    return { root, entry: "src/studio/studio.html" };
  },
};

export default mynoAdapter;
