type Locale = 'en' | 'hi';
type MessageKey = string;
/**
 * Set the current locale
 */
export declare const setLocale: (locale: Locale) => void;
/**
 * Get the current locale
 */
export declare const getLocale: () => Locale;
/**
 * Get a translated message by key
 * Supports nested keys like "auth.register.success"
 */
export declare const t: (key: MessageKey, params?: Record<string, string | number>) => string;
/**
 * Get all messages for a specific namespace
 */
export declare const getMessages: (namespace?: string) => any;
declare const _default: {
    t: (key: MessageKey, params?: Record<string, string | number>) => string;
    setLocale: (locale: Locale) => void;
    getLocale: () => Locale;
    getMessages: (namespace?: string) => any;
};
export default _default;
//# sourceMappingURL=i18n.d.ts.map