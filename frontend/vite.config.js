var _a, _b;
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
var apiTarget = (_a = process.env.VITE_DEV_API_TARGET) !== null && _a !== void 0 ? _a : "http://127.0.0.1:8080";
var webPort = Number.parseInt((_b = process.env.WEB_PORT) !== null && _b !== void 0 ? _b : "5173", 10);
export default defineConfig({
    plugins: [react()],
    server: {
        host: "127.0.0.1",
        port: Number.isNaN(webPort) ? 5173 : webPort,
        proxy: {
            "/api": {
                target: apiTarget,
                changeOrigin: true,
            },
        },
    },
});
