import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  server: { proxy: { "/api": "http://127.0.0.1:3001" } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "گریافارم | سامانه دارودرمانی سالمندان",
        short_name: "GeriaPharm",
        lang: "fa",
        dir: "rtl",
        description:
          "پشتیبان تصمیم بالینی دارودرمانی سالمندان بر پایه معیارهای بیرز ۲۰۲۳؛ بررسی نسخه، تداخل‌ها و تعدیل دوز کلیوی.",
        theme_color: "#0f3a46",
        background_color: "#f8fafc",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [{ urlPattern: /\/api\//, handler: "NetworkOnly" }],
      },
    }),
  ],
});