/**
 * Upload sport image to S3 with sport name in filename (replaces old image automatically)
 */
export declare const uploadSportImage: (sportId: string, file: Express.Multer.File) => Promise<string>;
/**
 * Delete sport image
 */
export declare const deleteSportImage: (sportId: string) => Promise<void>;
//# sourceMappingURL=sportImage.service.d.ts.map