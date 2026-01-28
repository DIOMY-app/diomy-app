export type DataApiCallOptions = {
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
    pathParams?: Record<string, unknown>;
    formData?: Record<string, unknown>;
};
export declare function callDataApi(apiId: string, options?: DataApiCallOptions): Promise<unknown>;
//# sourceMappingURL=dataApi.d.ts.map