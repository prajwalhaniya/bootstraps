import path from "path"
import { defineConfig } from "vite"
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
        "/auth": {
            target: "http://localhost:3000",
            changeOrigin: true,
            secure: false,
        },
        "/ts": {
            target: "http://localhost:3000",
            changeOrigin: true,
            secure: false,
        },
        "/py": {
            target: "http://localhost:3001",
            changeOrigin: true,
            secure: false,
        },
        "/agent": {
            target: "http://localhost:3005",
            changeOrigin: true,
            secure: false,
        },
    }
  }
})
