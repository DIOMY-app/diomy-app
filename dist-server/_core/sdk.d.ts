import { type AxiosInstance } from "axios";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import type { ExchangeTokenResponse, GetUserInfoResponse, GetUserInfoWithJwtResponse } from "./types/manusTypes";
export type SessionPayload = {
    openId: string;
    appId: string;
    name: string;
};
declare class SDKServer {
    private readonly client;
    private readonly oauthService;
    constructor(client?: AxiosInstance);
    private deriveLoginMethod;
    /**
     * Exchange OAuth authorization code for access token
     * @example
     * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
     */
    exchangeCodeForToken(code: string, state: string): Promise<ExchangeTokenResponse>;
    /**
     * Get user information using access token
     * @example
     * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
     */
    getUserInfo(accessToken: string): Promise<GetUserInfoResponse>;
    private parseCookies;
    private getSessionSecret;
    /**
     * Create a session token for a Manus user openId
     * @example
     * const sessionToken = await sdk.createSessionToken(userInfo.openId);
     */
    createSessionToken(openId: string, options?: {
        expiresInMs?: number;
        name?: string;
    }): Promise<string>;
    signSession(payload: SessionPayload, options?: {
        expiresInMs?: number;
    }): Promise<string>;
    verifySession(cookieValue: string | undefined | null): Promise<{
        openId: string;
        appId: string;
        name: string;
    } | null>;
    getUserInfoWithJwt(jwtToken: string): Promise<GetUserInfoWithJwtResponse>;
    authenticateRequest(req: Request): Promise<User>;
}
export declare const sdk: SDKServer;
export {};
//# sourceMappingURL=sdk.d.ts.map