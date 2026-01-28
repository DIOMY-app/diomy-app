"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemRouter = void 0;
const zod_1 = require("zod");
const notification_1 = require("./notification");
const trpc_1 = require("./trpc");
exports.systemRouter = (0, trpc_1.router)({
    health: trpc_1.publicProcedure
        .input(zod_1.z.object({
        timestamp: zod_1.z.number().min(0, "timestamp cannot be negative"),
    }))
        .query(() => ({
        ok: true,
    })),
    notifyOwner: trpc_1.adminProcedure
        .input(zod_1.z.object({
        title: zod_1.z.string().min(1, "title is required"),
        content: zod_1.z.string().min(1, "content is required"),
    }))
        .mutation(async ({ input }) => {
        const delivered = await (0, notification_1.notifyOwner)(input);
        return {
            success: delivered,
        };
    }),
});
