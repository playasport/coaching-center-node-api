import { MeiliSearch } from 'meilisearch';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * Meilisearch Client Service
 * Singleton pattern to ensure single connection instance
 */
class MeilisearchClientService {
  private client: MeiliSearch | null = null;
  private isInitialized = false;

  /**
   * Initialize Meilisearch client
   */
  public initialize(): MeiliSearch | null {
    if (!config.meilisearch.enabled) {
      logger.info('Meilisearch is disabled in configuration');
      return null;
    }

    if (this.isInitialized && this.client) {
      return this.client;
    }

    try {
      this.client = new MeiliSearch({
        host: config.meilisearch.host,
        apiKey: config.meilisearch.apiKey,
      });

      this.isInitialized = true;
      logger.info(`Meilisearch client initialized: ${config.meilisearch.host}`);
      return this.client;
    } catch (error) {
      logger.error('Failed to initialize Meilisearch client:', error);
      return null;
    }
  }

  /**
   * Get Meilisearch client instance
   */
  public getClient(): MeiliSearch | null {
    if (!config.meilisearch.enabled) {
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
  public isEnabled(): boolean {
    return config.meilisearch.enabled;
  }

  /**
   * Health check for Meilisearch
   */
  public async healthCheck(): Promise<boolean> {
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
    } catch (error) {
      logger.error('Meilisearch health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const meilisearchClient = new MeilisearchClientService();

// Initialize on module load
meilisearchClient.initialize();
