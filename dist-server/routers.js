"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appRouter = void 0;
const const_js_1 = require("../shared/const.js");
const cookies_1 = require("./_core/cookies");
const systemRouter_1 = require("./_core/systemRouter");
const trpc_1 = require("./_core/trpc");
exports.appRouter = (0, trpc_1.router)({
    system: systemRouter_1.systemRouter,
    auth: (0, trpc_1.router)({
        me: trpc_1.publicProcedure.query((opts) => opts.ctx.user),
        logout: trpc_1.publicProcedure.mutation(({ ctx }) => {
            const cookieOptions = (0, cookies_1.getSessionCookieOptions)(ctx.req);
            ctx.res.clearCookie(const_js_1.COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
            return {
                success: true,
            };
        }),
    }),
});
//# sourceMappingURL=routers.js.map