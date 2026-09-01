import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  // El target del proxy siempre debe ser una URL absoluta válida
  const backendUrl = env.VITE_BACKEND_URL || "http://127.0.0.1:5000";

  return {
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port: Number(env.VITE_FRONTEND_PORT) || 5176,
      strictPort: false,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        "/uploads": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
