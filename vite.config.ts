import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173, // Changed from 8080 to avoid conflict with Supervisor
    proxy: {
      '/ingest': {
        target: 'https://us.i.posthog.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ingest/, '')
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
