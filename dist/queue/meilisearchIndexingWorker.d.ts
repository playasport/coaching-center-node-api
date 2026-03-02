import { Worker } from 'bullmq';
import { MeilisearchIndexingJobData } from './meilisearchIndexingQueue';
/**
 * Worker to process Meilisearch indexing jobs
 */
export declare const meilisearchIndexingWorker: Worker<MeilisearchIndexingJobData, any, string>;
export declare const closeMeilisearchIndexingWorker: () => Promise<void>;
//# sourceMappingURL=meilisearchIndexingWorker.d.ts.map