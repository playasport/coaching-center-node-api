import { Request, Response, NextFunction } from 'express';
export declare const createBatch: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getBatch: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateBatch: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const toggleBatchStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteBatch: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getMyBatches: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getBatchesByCenter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=batch.controller.d.ts.map