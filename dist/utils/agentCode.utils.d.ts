/**
 * Generate a unique agentCode for AdminUser (agents).
 * Format: "AG" + 4 random digits (e.g. AG2562)
 * Checks DB for uniqueness; retries on collision.
 */
export declare const generateUniqueAgentCode: () => Promise<string>;
//# sourceMappingURL=agentCode.utils.d.ts.map