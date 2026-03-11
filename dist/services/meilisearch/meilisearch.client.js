"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meilisearchClient = void 0;
const meilisearch_1 = require("meilisearch");
const env_1 = require("../../config/env");
const logger_1 = require("../../utils/logger");
/**
 * Meilisearch Client Service
 * Singleton pattern to ensure single connection instance
 */
class MeilisearchClientService {
    constructor() {
        this.client = null;
        this.isInitialized = false;
    }
    /**
     * Initialize Meilisearch client
     */
    initialize() {
        if (!env_1.config.meilisearch.enabled) {
            logger_1.logger.info('Meilisearch is disabled in configuration');
            return null;
        }
        if (this.isInitialized && this.client) {
            return this.client;
        }
        try {
            this.client = new meilisearch_1.MeiliSearch({
                host: env_1.config.meilisearch.host,
                apiKey: env_1.config.meilisearch.apiKey,
            });
            this.isInitialized = true;
            logger_1.logger.info(`Meilisearch client initialized: ${env_1.config.meilisearch.host}`);
            return this.client;
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Meilisearch client:', error);
            return null;
        }
    }
    /**
     * Get Meilisearch client instance
     */
    getClient() {
        if (!env_1.config.meilisearch.enabled) {
            return null;
        }
        if (!this.isInitialized) {
            return this.initialize();
        }
        return this.client;
    }
    /**
     * Check if Meilisearch is enabled
     */
    isEnabled() {
        return env_1.config.meilisearch.enabled;
    }
    /**
     * Health check for Meilisearch
     */
    async healthCheck() {
        if (!this.isEnabled()) {
            return false;
        }
        const client = this.getClient();
        if (!client) {
            return false;
        }
        try {
            await client.health();
            return true;
        }
        catch (error) {
            logger_1.logger.error('Meilisearch health check failed:', error);
            return false;
        }
    }
}
// Export singleton instance
exports.meilisearchClient = new MeilisearchClientService();
// Initialize on module load
exports.meilisearchClient.initialize();
//# sourceMappingURL=meilisearch.client.js.map