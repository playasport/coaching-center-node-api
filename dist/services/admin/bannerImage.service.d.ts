/**
 * Upload banner image to S3
 * @param file - Multer file object
 * @param type - 'desktop' or 'mobile'
 * @returns S3 URL of uploaded image
 */
export declare const uploadBannerImage: (file: Express.Multer.File, type?: "desktop" | "mobile") => Promise<string>;
/**
 * Upload both desktop and mobile banner images
 * @param desktopFile - Desktop banner image
 * @param mobileFile - Mobile banner image (optional)
 * @returns Object with imageUrl and mobileImageUrl
 */
export declare const uploadBannerImages: (desktopFile: Express.Multer.File, mobileFile?: Express.Multer.File) => Promise<{
    imageUrl: string;
    mobileImageUrl?: string;
}>;
//# sourceMappingURL=bannerImage.service.d.ts.map