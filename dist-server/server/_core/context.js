"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = createContext;
const sdk_1 = require("./sdk");
async function createContext(opts) {
    let user = null;
    try {
        user = await sdk_1.sdk.authenticateRequest(opts.req);
    }
    catch (error) {
        // Authentication is optional for public procedures.
        user = null;
    }
    return {
        req: opts.req,
        res: opts.res,
        user,
    };
}
