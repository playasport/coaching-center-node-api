"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const validate = (schema) => {
    return async (req, _res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));
                const message = errors[0]?.message ?? (0, i18n_1.t)('validation.failed');
                next(new ApiError_1.ApiError(400, message, errors));
                return;
            }
            next(error);
        }
    };
};
exports.validate = validate;
//# sourceMappingURL=validation.middleware.js.map