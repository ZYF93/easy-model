/// <reference types="vitest" />
import { defineConfig } from "vite";
import packageJson from "./package.json";
import path from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [
    react({
      babel: {
        plugins: [
          [
            "@babel/plugin-proposal-decorators",
            {
              version: "2023-11",
            },
          ],
        ],
      },
    }),
  ],
  build: {
    outDir: "./dist",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: packageJson.name,
      formats: ["es", "umd"],
      fileName: format => `index.${format}.js`,
    },
    rollupOptions: {
      external: ["react", "zod"],
      output: {
        globals: {
          react: "React",
          zod: "Zod",
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
