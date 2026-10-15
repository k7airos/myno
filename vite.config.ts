import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  // 同一套资源支持 file:// 导出和宿主的任意静态资源挂载前缀。
  base: "./",
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: false,
    manifest: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        studio: resolve(__dirname, "src/studio/studio.html"),
        "editor-export": resolve(__dirname, "src/studio/editor-export.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:18765",
        changeOrigin: true,
      },
    },
  },
});
