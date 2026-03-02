type LogMethod = (message: string, meta?: unknown) => void;
export declare const logger: {
    debug: LogMethod;
    info: LogMethod;
    warn: LogMethod;
    error: LogMethod;
    withContext: (context: Record<string, unknown>) => {
        debug: (message: string, meta?: unknown) => void;
        info: (message: string, meta?: unknown) => void;
        warn: (message: string, meta?: unknown) => void;
        error: (message: string, meta?: unknown) => void;
    };
};
export type Logger = typeof logger;
export {};
//# sourceMappingURL=logger.d.ts.map