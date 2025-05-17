/// <reference types="vitest" />
import { defineConfig } from "vite";
import packageJson from "./package.json";
import path from "path";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "./dist",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: packageJson.name,
      formats: ["es", "umd"],
      fileName: format => `index.${format}.js`,
    },
    rollupOptions: {
      external: ["react"],
      output: {
        globals: {
          react: "React",
        },
      },
    },
  },
  test: {
    watch: false,
    setupFiles: "./test/setup.ts",
    environment: "jsdom",
    poolOptions: {
      threads: {
        execArgv: ["--expose-gc"],
      },
      forks: {
        execArgv: ["--expose-gc"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@@": path.resolve(__dirname),
    },
  },
});
