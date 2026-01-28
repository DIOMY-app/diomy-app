import { InsertUser } from "../drizzle/schema";
export declare function getDb(): Promise<(import("drizzle-orm/mysql2").MySql2Database<Record<string, unknown>> & {
    $client: import("mysql2").Pool;
}) | null>;
export declare function upsertUser(user: InsertUser): Promise<void>;
export declare function getUserByOpenId(openId: string): Promise<{
    id: number;
    openId: string;
    name: string | null;
    email: string | null;
    loginMethod: string | null;
    role: "user" | "admin";
    createdAt: Date;
    updatedAt: Date;
    lastSignedIn: Date;
} | undefined>;
//# sourceMappingURL=db.d.ts.map