import { resolve } from "path";
import { defineConfig  } from "vite";
// plugins
import legacy from "@vitejs/plugin-legacy";
// paths
const index = `src/pages/${process.env.NODE_ENV ? '' : 'index'}`, // prod/dev detection
  assets = resolve('./src'),
  dist = resolve("./dist"),
  pages = resolve("./src/pages")

// https://vitejs.dev/config/
export default defineConfig({
  root: index,
  publicDir: assets,
  server: {
    open: true,
    force: true,
  },
  build: {
    outDir: dist,
    rollupOptions: {
      input: {
        main: pages + "/index/index.html",
        about: pages + "/about/index.html",
      },
    },
  },
  plugins: [
    legacy({
      targets: ['ie >= 11'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    }),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: assets},
    ]
  },
});
