import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-vendor")) return "charts";
          if (id.includes("antd") || id.includes("@ant-design") || id.includes("rc-")) return "antd";
          if (id.includes("@dnd-kit")) return "dnd";
          if (id.includes("motion") || id.includes("gsap") || id.includes("lottie")) return "motion";
          if (id.includes("react") || id.includes("scheduler") || id.includes("react-dom")) return "react";
        },
      },
    },
  },
});