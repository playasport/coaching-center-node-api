export declare class ApiError extends Error {
    statusCode: number;
    data: unknown;
    errors: unknown[];
    success: boolean;
    constructor(statusCode: number, message?: string, errors?: unknown[], stack?: string);
}
//# sourceMappingURL=ApiError.d.ts.map