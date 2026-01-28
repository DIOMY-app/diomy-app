"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOAuthRoutes = registerOAuthRoutes;
const const_js_1 = require("../../shared/const.js");
const db_1 = require("../db");
const cookies_1 = require("./cookies");
const sdk_1 = require("./sdk");
function getQueryParam(req, key) {
    const value = req.query[key];
    return typeof value === "string" ? value : undefined;
}
async function syncUser(userInfo) {
    if (!userInfo.openId) {
        throw new Error("openId missing from user info");
    }
    const lastSignedIn = new Date();
    await (0, db_1.upsertUser)({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn,
    });
    const saved = await (0, db_1.getUserByOpenId)(userInfo.openId);
    return (saved ?? {
        openId: userInfo.openId,
        name: userInfo.name,
        email: userInfo.email,
        loginMethod: userInfo.loginMethod ?? null,
        lastSignedIn,
    });
}
function buildUserResponse(user) {
    return {
        id: user?.id ?? null,
        openId: user?.openId ?? null,
        name: user?.name ?? null,
        email: user?.email ?? null,
        loginMethod: user?.loginMethod ?? null,
        lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
    };
}
function registerOAuthRoutes(app) {
    app.get("/api/oauth/callback", async (req, res) => {
        const code = getQueryParam(req, "code");
        const state = getQueryParam(req, "state");
        if (!code || !state) {
            res.status(400).json({ error: "code and state are required" });
            return;
        }
        try {
            const tokenResponse = await sdk_1.sdk.exchangeCodeForToken(code, state);
            const userInfo = await sdk_1.sdk.getUserInfo(tokenResponse.accessToken);
            await syncUser(userInfo);
            const sessionToken = await sdk_1.sdk.createSessionToken(userInfo.openId, {
                name: userInfo.name || "",
                expiresInMs: const_js_1.ONE_YEAR_MS,
            });
            const cookieOptions = (0, cookies_1.getSessionCookieOptions)(req);
            res.cookie(const_js_1.COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: const_js_1.ONE_YEAR_MS });
            const frontendUrl = process.env.EXPO_WEB_PREVIEW_URL ||
                process.env.EXPO_PACKAGER_PROXY_URL ||
                "http://localhost:8081";
            res.redirect(302, frontendUrl);
        }
        catch (error) {
            console.error("[OAuth] Callback failed", error);
            res.status(500).json({ error: "OAuth callback failed" });
        }
    });
    app.get("/api/oauth/mobile", async (req, res) => {
        const code = getQueryParam(req, "code");
        const state = getQueryParam(req, "state");
        if (!code || !state) {
            res.status(400).json({ error: "code and state are required" });
            return;
        }
        try {
            const tokenResponse = await sdk_1.sdk.exchangeCodeForToken(code, state);
            const userInfo = await sdk_1.sdk.getUserInfo(tokenResponse.accessToken);
            const user = await syncUser(userInfo);
            const sessionToken = await sdk_1.sdk.createSessionToken(userInfo.openId, {
                name: userInfo.name || "",
                expiresInMs: const_js_1.ONE_YEAR_MS,
            });
            const cookieOptions = (0, cookies_1.getSessionCookieOptions)(req);
            res.cookie(const_js_1.COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: const_js_1.ONE_YEAR_MS });
            res.json({
                app_session_id: sessionToken,
                user: buildUserResponse(user),
            });
        }
        catch (error) {
            console.error("[OAuth] Mobile exchange failed", error);
            res.status(500).json({ error: "OAuth mobile exchange failed" });
        }
    });
    app.post("/api/auth/logout", (req, res) => {
        const cookieOptions = (0, cookies_1.getSessionCookieOptions)(req);
        res.clearCookie(const_js_1.COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        res.json({ success: true });
    });
    app.get("/api/auth/me", async (req, res) => {
        try {
            const user = await sdk_1.sdk.authenticateRequest(req);
            res.json({ user: buildUserResponse(user) });
        }
        catch (error) {
            console.error("[Auth] /api/auth/me failed:", error);
            res.status(401).json({ error: "Not authenticated", user: null });
        }
    });
    app.post("/api/auth/session", async (req, res) => {
        try {
            const user = await sdk_1.sdk.authenticateRequest(req);
            const authHeader = req.headers.authorization || req.headers.Authorization;
            if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
                res.status(400).json({ error: "Bearer token required" });
                return;
            }
            const token = authHeader.slice("Bearer ".length).trim();
            const cookieOptions = (0, cookies_1.getSessionCookieOptions)(req);
            res.cookie(const_js_1.COOKIE_NAME, token, { ...cookieOptions, maxAge: const_js_1.ONE_YEAR_MS });
            res.json({ success: true, user: buildUserResponse(user) });
        }
        catch (error) {
            console.error("[Auth] /api/auth/session failed:", error);
            res.status(401).json({ error: "Invalid token" });
        }
    });
    app.get("/api/route", async (req, res) => {
        const { start, end } = req.query;
        try {
            const response = await fetch(`http://localhost:5000/route/v1/driving/${start};${end}?overview=full&geometries=geojson`);
            const data = await response.json();
            res.json(data);
        }
        catch (error) {
            res.status(500).json({ error: "Erreur OSRM" });
        }
    });
}
//# sourceMappingURL=oauth.js.map