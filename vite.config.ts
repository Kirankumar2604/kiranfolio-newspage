import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  base: process.env.BASE_URL || "/",
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    target: "es2018",
    assetsDir: "assets",
    cssCodeSplit: true,
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === "production",
        drop_debugger: process.env.NODE_ENV === "production",
      },
    },
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom")) return "vendor-react";
            if (id.includes("react-markdown") || id.includes("remark-gfm")) return "vendor-markdown";
            if (id.includes("recharts")) return "vendor-charts";
            if (id.includes("lucide-react") || id.includes("react-icons")) return "vendor-icons";
            return "vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
    reportCompressedSize: true,
  },
  // Ensure PostCSS gets a default `from` option to avoid the common
  // warning: "A PostCSS plugin did not pass the `from` option to postcss.parse".
  // Setting `from: undefined` prevents PostCSS from warning when plugins
  // call parse without a source. This helps builds on Vercel where some
  // plugin versions may still call postcss.parse without passing `from`.
  css: {
    postcss: {
      from: undefined as unknown as string | undefined,
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  server: {
    port: 8000,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
