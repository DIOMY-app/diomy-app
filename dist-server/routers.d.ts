export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: import("./api/context.js").TrpcContext;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: true;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    system: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./api/context.js").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        health: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                timestamp: number;
            };
            output: {
                ok: boolean;
            };
            meta: object;
        }>;
        notifyOwner: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                title: string;
                content: string;
            };
            output: {
                readonly success: boolean;
            };
            meta: object;
        }>;
    }>>;
    auth: import("@trpc/server").TRPCBuiltRouter<{
        ctx: import("./api/context.js").TrpcContext;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: true;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        me: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: number;
                openId: string;
                name: string | null;
                email: string | null;
                loginMethod: string | null;
                role: "user" | "admin";
                createdAt: Date;
                updatedAt: Date;
                lastSignedIn: Date;
            } | null;
            meta: object;
        }>;
        logout: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                readonly success: true;
            };
            meta: object;
        }>;
    }>>;
}>>;
export type AppRouter = typeof appRouter;
//# sourceMappingURL=routers.d.ts.map