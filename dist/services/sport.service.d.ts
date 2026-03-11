export interface SportListItem {
    _id: string;
    custom_id: string;
    name: string;
    logo: string | null;
    is_popular: boolean;
}
export declare const getAllSports: () => Promise<SportListItem[]>;
//# sourceMappingURL=sport.service.d.ts.map