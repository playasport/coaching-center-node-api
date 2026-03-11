import { Settings } from '../models/settings.model';
/**
 * Get application settings
 * Returns the single settings document (creates default if doesn't exist)
 */
export declare const getSettings: () => Promise<Settings>;
/**
 * Update application settings
 * Merges new data with existing settings
 */
export declare const updateSettings: (data: Partial<Settings>) => Promise<Settings>;
/**
 * Reset settings to default
 */
export declare const resetSettings: () => Promise<Settings>;
//# sourceMappingURL=settings.service.d.ts.map