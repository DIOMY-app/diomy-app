"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminProcedure = exports.protectedProcedure = exports.publicProcedure = exports.router = void 0;
const const_js_1 = require("../../shared/const.js");
const server_1 = require("@trpc/server");
const superjson_1 = __importDefault(require("superjson"));
const t = server_1.initTRPC.context().create({
    transformer: superjson_1.default,
});
exports.router = t.router;
exports.publicProcedure = t.procedure;
const requireUser = t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user) {
        throw new server_1.TRPCError({ code: "UNAUTHORIZED", message: const_js_1.UNAUTHED_ERR_MSG });
    }
    return next({
        ctx: {
            ...ctx,
            user: ctx.user,
        },
    });
});
exports.protectedProcedure = t.procedure.use(requireUser);
exports.adminProcedure = t.procedure.use(t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
        throw new server_1.TRPCError({ code: "FORBIDDEN", message: const_js_1.NOT_ADMIN_ERR_MSG });
    }
    return next({
        ctx: {
            ...ctx,
            user: ctx.user,
        },
    });
}));
