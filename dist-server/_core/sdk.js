"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sdk = void 0;
const const_js_1 = require("../../shared/const.js");
const errors_js_1 = require("../../shared/_core/errors.js");
const axios_1 = __importDefault(require("axios"));
const cookie_1 = require("cookie");
const jose_1 = require("jose");
const db = __importStar(require("../db"));
const env_1 = require("./env");
const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
const EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
const GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
class OAuthService {
    constructor(client) {
        this.client = client;
        console.log("[OAuth] Initialized with baseURL:", env_1.ENV.oAuthServerUrl);
        if (!env_1.ENV.oAuthServerUrl) {
            console.error("[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable.");
        }
    }
    decodeState(state) {
        const redirectUri = atob(state);
        return redirectUri;
    }
    async getTokenByCode(code, state) {
        const payload = {
            clientId: env_1.ENV.appId,
            grantType: "authorization_code",
            code,
            redirectUri: this.decodeState(state),
        };
        const { data } = await this.client.post(EXCHANGE_TOKEN_PATH, payload);
        return data;
    }
    async getUserInfoByToken(token) {
        const { data } = await this.client.post(GET_USER_INFO_PATH, {
            accessToken: token.accessToken,
        });
        return data;
    }
}
const createOAuthHttpClient = () => axios_1.default.create({
    baseURL: env_1.ENV.oAuthServerUrl,
    timeout: const_js_1.AXIOS_TIMEOUT_MS,
});
class SDKServer {
    constructor(client = createOAuthHttpClient()) {
        this.client = client;
        this.oauthService = new OAuthService(this.client);
    }
    deriveLoginMethod(platforms, fallback) {
        if (fallback && fallback.length > 0)
            return fallback;
        if (!Array.isArray(platforms) || platforms.length === 0)
            return null;
        const set = new Set(platforms.filter((p) => typeof p === "string"));
        if (set.has("REGISTERED_PLATFORM_EMAIL"))
            return "email";
        if (set.has("REGISTERED_PLATFORM_GOOGLE"))
            return "google";
        if (set.has("REGISTERED_PLATFORM_APPLE"))
            return "apple";
        if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
            return "microsoft";
        if (set.has("REGISTERED_PLATFORM_GITHUB"))
            return "github";
        const first = Array.from(set)[0];
        return first ? first.toLowerCase() : null;
    }
    async exchangeCodeForToken(code, state) {
        return this.oauthService.getTokenByCode(code, state);
    }
    async getUserInfo(accessToken) {
        const data = await this.oauthService.getUserInfoByToken({
            accessToken,
        });
        const dataAny = data;
        const loginMethod = this.deriveLoginMethod(dataAny?.platforms, dataAny?.platform ?? dataAny.platform ?? null);
        return {
            ...dataAny,
            platform: loginMethod,
            loginMethod,
        };
    }
    parseCookies(cookieHeader) {
        if (!cookieHeader) {
            return new Map();
        }
        const parsed = (0, cookie_1.parse)(cookieHeader);
        return new Map(Object.entries(parsed));
    }
    getSessionSecret() {
        const secret = env_1.ENV.cookieSecret || "default-secret-do-not-use";
        return new TextEncoder().encode(secret);
    }
    async createSessionToken(openId, options = {}) {
        return this.signSession({
            openId,
            appId: env_1.ENV.appId,
            name: options.name || "",
        }, options);
    }
    async signSession(payload, options = {}) {
        const issuedAt = Date.now();
        const expiresInMs = options.expiresInMs ?? const_js_1.ONE_YEAR_MS;
        const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
        const secretKey = this.getSessionSecret();
        return new jose_1.SignJWT({
            openId: payload.openId,
            appId: payload.appId,
            name: payload.name,
        })
            .setProtectedHeader({ alg: "HS256", typ: "JWT" })
            .setExpirationTime(expirationSeconds)
            .sign(secretKey);
    }
    async verifySession(cookieValue) {
        if (!cookieValue)
            return null;
        try {
            const secretKey = this.getSessionSecret();
            const { payload } = await (0, jose_1.jwtVerify)(cookieValue, secretKey, {
                algorithms: ["HS256"],
            });
            const { openId, appId, name } = payload;
            if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
                return null;
            }
            return { openId, appId, name };
        }
        catch (error) {
            return null;
        }
    }
    async getUserInfoWithJwt(jwtToken) {
        const payload = {
            jwtToken,
            projectId: env_1.ENV.appId,
        };
        const { data } = await this.client.post(GET_USER_INFO_WITH_JWT_PATH, payload);
        const dataAny = data;
        const loginMethod = this.deriveLoginMethod(dataAny?.platforms, dataAny?.platform ?? dataAny.platform ?? null);
        return {
            ...dataAny,
            platform: loginMethod,
            loginMethod,
        };
    }
    async authenticateRequest(req) {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        let token;
        if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
            token = authHeader.slice("Bearer ".length).trim();
        }
        const cookies = this.parseCookies(req.headers.cookie);
        const sessionCookie = token || cookies.get(const_js_1.COOKIE_NAME);
        const session = await this.verifySession(sessionCookie);
        if (!session) {
            throw (0, errors_js_1.ForbiddenError)("Invalid session cookie");
        }
        const sessionUserId = session.openId;
        const signedInAt = new Date();
        let user = await db.getUserByOpenId(sessionUserId);
        if (!user) {
            try {
                const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
                await db.upsertUser({
                    openId: userInfo.openId,
                    name: userInfo.name || null,
                    email: userInfo.email ?? null,
                    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
                    lastSignedIn: signedInAt,
                });
                user = await db.getUserByOpenId(userInfo.openId);
            }
            catch (error) {
                throw (0, errors_js_1.ForbiddenError)("Failed to sync user info");
            }
        }
        if (!user)
            throw (0, errors_js_1.ForbiddenError)("User not found");
        await db.upsertUser({
            openId: user.openId,
            lastSignedIn: signedInAt,
        });
        return user;
    }
}
exports.sdk = new SDKServer();
//# sourceMappingURL=sdk.js.map