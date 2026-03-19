/**
 * Reconciliation job: create missing payout records for bookings
 * where payment was verified but payout was not created (e.g. process crash, deploy during fire-and-forget).
 * Safe to run repeatedly - createPayoutRecord is idempotent (skips if payout exists).
 */
export declare const executePayoutReconciliationJob: () => Promise<void>;
/**
 * Schedule: run every hour to catch any missed payouts.
 */
export declare const startPayoutReconciliationJob: () => void;
//# sourceMappingURL=payoutReconciliation.job.d.ts.map