export declare function storagePut(relKey: string, data: Buffer | Uint8Array | string, contentType?: string): Promise<{
    key: string;
    url: string;
}>;
export declare function storageGet(relKey: string): Promise<{
    key: string;
    url: string;
}>;
//# sourceMappingURL=storage.d.ts.map