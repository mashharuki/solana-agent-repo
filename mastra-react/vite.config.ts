import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

// Viteの設定
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // 開発サーバーのプロキシ設定
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4111",
        changeOrigin: true,
      },
    },
  },
  // テスト設定
  test: {
    globals: true,
    environment: "node",
  },
});
