import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Builds the generative shell client into assets/genui with fixed filenames,
 * so index.html and the layout can reference them statically and Jekyll can
 * copy them into _site like any other asset.
 *
 * Build order matters: `vite build` first, then `bundle exec jekyll build`.
 * `npm run build:site` does both in that order.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "assets/genui",
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: false,
    target: "es2022",
    rollupOptions: {
      input: "src/genui/main.tsx",
      output: {
        format: "es",
        inlineDynamicImports: true,
        entryFileNames: "genui.js",
        chunkFileNames: "genui-[name].js",
        assetFileNames: (asset) => {
          const name = asset.names?.[0] ?? "";
          return name.endsWith(".css") ? "genui.css" : "genui-[name][extname]";
        },
      },
    },
  },
});
