export type NotificationPayload = {
    title: string;
    content: string;
};
/**
 * Dispatches a project-owner notification through the Manus Notification Service.
 * Returns `true` if the request was accepted, `false` when the upstream service
 * cannot be reached (callers can fall back to email/slack). Validation errors
 * bubble up as TRPC errors so callers can fix the payload.
 */
export declare function notifyOwner(payload: NotificationPayload): Promise<boolean>;
//# sourceMappingURL=notification.d.ts.map