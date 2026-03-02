import { MeiliSearch } from 'meilisearch';
/**
 * Meilisearch Client Service
 * Singleton pattern to ensure single connection instance
 */
declare class MeilisearchClientService {
    private client;
    private isInitialized;
    /**
     * Initialize Meilisearch client
     */
    initialize(): MeiliSearch | null;
    /**
     * Get Meilisearch client instance
     */
    getClient(): MeiliSearch | null;
    /**
     * Check if Meilisearch is enabled
     */
    isEnabled(): boolean;
    /**
     * Health check for Meilisearch
     */
    healthCheck(): Promise<boolean>;
}
export declare const meilisearchClient: MeilisearchClientService;
export {};
//# sourceMappingURL=meilisearch.client.d.ts.map