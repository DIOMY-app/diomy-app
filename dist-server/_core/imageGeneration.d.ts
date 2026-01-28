export type GenerateImageOptions = {
    prompt: string;
    originalImages?: Array<{
        url?: string;
        b64Json?: string;
        mimeType?: string;
    }>;
};
export type GenerateImageResponse = {
    url?: string;
};
export declare function generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse>;
//# sourceMappingURL=imageGeneration.d.ts.map