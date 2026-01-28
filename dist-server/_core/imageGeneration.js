"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateImage = generateImage;
const storage_1 = require("../storage");
const env_1 = require("./env");
async function generateImage(options) {
    if (!env_1.ENV.forgeApiUrl) {
        throw new Error("BUILT_IN_FORGE_API_URL is not configured");
    }
    if (!env_1.ENV.forgeApiKey) {
        throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
    }
    const baseUrl = env_1.ENV.forgeApiUrl.endsWith("/") ? env_1.ENV.forgeApiUrl : `${env_1.ENV.forgeApiUrl}/`;
    const fullUrl = new URL("images.v1.ImageService/GenerateImage", baseUrl).toString();
    const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
            accept: "application/json",
            "content-type": "application/json",
            "connect-protocol-version": "1",
            authorization: `Bearer ${env_1.ENV.forgeApiKey}`,
        },
        body: JSON.stringify({
            prompt: options.prompt,
            original_images: options.originalImages || [],
        }),
    });
    if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`);
    }
    const result = (await response.json());
    const base64Data = result.image.b64Json;
    const buffer = Buffer.from(base64Data, "base64");
    const { url } = await (0, storage_1.storagePut)(`generated/${Date.now()}.png`, buffer, result.image.mimeType);
    return {
        url,
    };
}
//# sourceMappingURL=imageGeneration.js.map