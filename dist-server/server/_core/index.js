"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const net_1 = __importDefault(require("net"));
const express_2 = require("@trpc/server/adapters/express");
const oauth_1 = require("./oauth");
const routers_1 = require("../routers");
const context_1 = require("./context");
function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net_1.default.createServer();
        server.listen(port, () => {
            server.close(() => resolve(true));
        });
        server.on("error", () => resolve(false));
    });
}
async function findAvailablePort(startPort = 3000) {
    for (let port = startPort; port < startPort + 20; port++) {
        if (await isPortAvailable(port)) {
            return port;
        }
    }
    throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
    const app = (0, express_1.default)();
    const server = (0, http_1.createServer)(app);
    // Enable CORS for all routes - reflect the request origin to support credentials
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        if (origin) {
            res.header("Access-Control-Allow-Origin", origin);
        }
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        res.header("Access-Control-Allow-Credentials", "true");
        // Handle preflight requests
        if (req.method === "OPTIONS") {
            res.sendStatus(200);
            return;
        }
        next();
    });
    app.use(express_1.default.json({ limit: "50mb" }));
    app.use(express_1.default.urlencoded({ limit: "50mb", extended: true }));
    (0, oauth_1.registerOAuthRoutes)(app);
    app.get("/api/health", (_req, res) => {
        res.json({ ok: true, timestamp: Date.now() });
    });
    app.use("/api/trpc", (0, express_2.createExpressMiddleware)({
        router: routers_1.appRouter,
        createContext: context_1.createContext,
    }));
    const preferredPort = parseInt(process.env.PORT || "3000");
    const port = await findAvailablePort(preferredPort);
    if (port !== preferredPort) {
        console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
    }
    server.listen(port, () => {
        console.log(`[api] server listening on port ${port}`);
    });
}
startServer().catch(console.error);
