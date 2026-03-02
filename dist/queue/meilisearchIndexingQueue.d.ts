import { Queue } from 'bullmq';
export declare const MEILISEARCH_INDEXING_QUEUE_NAME = "meilisearch-indexing";
export declare enum IndexingJobType {
    INDEX_COACHING_CENTER = "index_coaching_center",
    UPDATE_COACHING_CENTER = "update_coaching_center",
    DELETE_COACHING_CENTER = "delete_coaching_center",
    INDEX_SPORT = "index_sport",
    UPDATE_SPORT = "update_sport",
    DELETE_SPORT = "delete_sport",
    INDEX_REEL = "index_reel",
    UPDATE_REEL = "update_reel",
    DELETE_REEL = "delete_reel",
    INDEX_STREAM_HIGHLIGHT = "index_stream_highlight",
    UPDATE_STREAM_HIGHLIGHT = "update_stream_highlight",
    DELETE_STREAM_HIGHLIGHT = "delete_stream_highlight"
}
export interface MeilisearchIndexingJobData {
    type: IndexingJobType;
    documentId: string;
    timestamp: number;
}
/**
 * Create the Meilisearch indexing queue
 */
export declare const meilisearchIndexingQueue: Queue<MeilisearchIndexingJobData, any, string, MeilisearchIndexingJobData, any, string>;
/**
 * Enqueue a Meilisearch indexing job
 */
export declare const enqueueMeilisearchIndexing: (type: IndexingJobType, documentId: string) => Promise<void>;
//# sourceMappingURL=meilisearchIndexingQueue.d.ts.map