/** Converts name to title case: first letter of each word capitalized, rest lowercase */
export const toTitleCase = (str: string): string =>
  str
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''))
    .filter(Boolean)
    .join(' ');
