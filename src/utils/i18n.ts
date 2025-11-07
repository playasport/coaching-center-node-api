import en from '../locales/en.json';
import hi from '../locales/hi.json';

type Locale = 'en' | 'hi';
type MessageKey = string;

let currentLocale: Locale = 'en';

const locales: Record<Locale, any> = {
  en,
  hi,
};

/**
 * Set the current locale
 */
export const setLocale = (locale: Locale): void => {
  currentLocale = locale;
};

/**
 * Get the current locale
 */
export const getLocale = (): Locale => {
  return currentLocale;
};

/**
 * Get a translated message by key
 * Supports nested keys like "auth.register.success"
 */
export const t = (key: MessageKey, params?: Record<string, string | number>): string => {
  const keys = key.split('.');
  let message: any = locales[currentLocale];

  // Navigate through nested object
  for (const k of keys) {
    if (message && typeof message === 'object' && k in message) {
      message = message[k];
    } else {
      // Key not found, return the key itself
      return key;
    }
  }

  // If message is a string, replace placeholders
  if (typeof message === 'string' && params) {
    return message.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey]?.toString() || match;
    });
  }

  return typeof message === 'string' ? message : key;
};

/**
 * Get all messages for a specific namespace
 */
export const getMessages = (namespace?: string): any => {
  if (!namespace) {
    return locales[currentLocale];
  }

  const keys = namespace.split('.');
  let messages: any = locales[currentLocale];

  for (const k of keys) {
    if (messages && typeof messages === 'object' && k in messages) {
      messages = messages[k];
    } else {
      return {};
    }
  }

  return messages || {};
};

export default { t, setLocale, getLocale, getMessages };

