"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparePassword = exports.hashPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const hashPassword = async (password) => {
    const salt = await bcryptjs_1.default.genSalt(10);
    const hash = await bcryptjs_1.default.hash(password, salt);
    if (hash.startsWith('$2a$')) {
        return `$2y${hash.substring(3)}`;
    }
    return hash;
};
exports.hashPassword = hashPassword;
const comparePassword = async (password, hashedPassword) => {
    const normalizedHash = hashedPassword.startsWith('$2y$')
        ? `$2a${hashedPassword.substring(3)}`
        : hashedPassword;
    return bcryptjs_1.default.compare(password, normalizedHash);
};
exports.comparePassword = comparePassword;
//# sourceMappingURL=password.js.map