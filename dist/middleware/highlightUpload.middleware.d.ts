import { Request, Response, NextFunction } from 'express';
/**
 * Upload video for highlight
 */
export declare const uploadHighlightVideo: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Upload thumbnail for highlight
 */
export declare const uploadHighlightThumbnail: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Upload preview video for highlight
 * Preview videos are typically smaller, compressed versions of the main video
 */
export declare const uploadHighlightPreview: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Upload both video and thumbnail
 */
export declare const uploadHighlightMedia: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=highlightUpload.middleware.d.ts.map