import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          supabase: ["@supabase/supabase-js"],
          pdf: ["jspdf", "jspdf-autotable"],
          "ui-vendor": ["react-toastify", "lucide-react"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
