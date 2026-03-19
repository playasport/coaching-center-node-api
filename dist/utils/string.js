"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toTitleCase = void 0;
/** Converts name to title case: first letter of each word capitalized, rest lowercase */
const toTitleCase = (str) => str
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''))
    .filter(Boolean)
    .join(' ');
exports.toTitleCase = toTitleCase;
//# sourceMappingURL=string.js.map