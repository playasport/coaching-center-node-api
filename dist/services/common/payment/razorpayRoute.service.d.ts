import { BusinessType } from '../../../models/academyPayoutAccount.model';
/**
 * Razorpay Route API Service
 * Handles Linked Account creation and management for payouts
 */
export declare class RazorpayRouteService {
    private razorpay;
    constructor();
    /**
     * Initialize Razorpay instance
     */
    private initialize;
    /**
     * Ensure Razorpay is initialized
     */
    private ensureInitialized;
    /**
     * Create a Linked Account (Route Account) with KYC details
     * @param kycData KYC information for the account
     * @returns Razorpay account response
     */
    createLinkedAccount(kycData: {
        email: string;
        phone: string;
        type: 'route';
        legal_business_name: string;
        business_type: BusinessType;
        contact_name: string;
        profile: {
            category: string;
            subcategory: string;
            addresses: {
                registered: {
                    street1: string;
                    street2?: string;
                    city: string;
                    state: string;
                    postal_code: string;
                    country: string;
                };
            };
        };
        legal_info: {
            pan?: string;
            gst?: string;
        };
    }): Promise<any>;
    /**
     * Create a stakeholder for the Linked Account
     * @param accountId Razorpay account ID
     * @param stakeholderData Stakeholder information
     * @returns Stakeholder response
     */
    createStakeholder(accountId: string, stakeholderData: {
        name: string;
        email: string;
        phone: string;
        relationship: 'director' | 'proprietor' | 'partner' | 'authorised_signatory';
        kyc: {
            pan?: string;
            aadhaar?: string;
        };
        address?: {
            street?: string;
            city?: string;
            state?: string;
            postal_code?: string;
            country?: string;
        };
    }): Promise<any>;
    /**
     * Request product configuration for Route
     * @param accountId Razorpay account ID
     * @returns Product configuration response
     */
    requestProductConfiguration(accountId: string): Promise<any>;
    /**
     * Get product configuration details
     * @param accountId Razorpay account ID
     * @returns Product configuration response
     */
    getProductConfiguration(accountId: string): Promise<any>;
    /**
     * Update bank account details for Route product
     * @param accountId Razorpay account ID
     * @param productId Product configuration ID (acc_prd_xxx)
     * @param bankDetails Bank account information
     * @returns Update response
     */
    /**
     * Get product configuration details with full status
     * @param accountId Razorpay account ID
     * @param productId Product configuration ID
     * @returns Product configuration with status and requirements
     */
    getProductConfigurationDetails(accountId: string, productId: string): Promise<any>;
    updateBankDetails(accountId: string, productId: string, bankDetails: {
        account_number: string;
        ifsc: string;
        beneficiary_name: string;
        beneficiary_mobile?: string;
        beneficiary_email?: string;
    }): Promise<any>;
    /**
     * Get account details and status
     * @param accountId Razorpay account ID
     * @returns Account details
     */
    getAccountDetails(accountId: string): Promise<any>;
    /**
     * Create a transfer to academy's Razorpay account
     * @param accountId Academy's Razorpay account ID
     * @param amount Amount to transfer (in rupees, will be converted to paise)
     * @param currency Currency (default: INR)
     * @param notes Optional notes for the transfer
     * @returns Transfer response from Razorpay
     */
    createTransfer(accountId: string, amount: number, currency?: string, notes?: Record<string, any>): Promise<any>;
    /**
     * Get transfer details from Razorpay
     * @param transferId Razorpay transfer ID
     * @returns Transfer details
     */
    getTransferDetails(transferId: string): Promise<any>;
    /**
     * Create a refund for a payment
     * @param paymentId Razorpay payment ID
     * @param amount Amount to refund (in rupees, will be converted to paise). If not provided, full refund
     * @param notes Optional notes for the refund
     * @returns Refund response from Razorpay
     */
    createRefund(paymentId: string, amount?: number, notes?: Record<string, any>): Promise<any>;
    /**
     * Get refund details from Razorpay
     * @param refundId Razorpay refund ID
     * @returns Refund details
     */
    getRefundDetails(refundId: string): Promise<any>;
}
export declare const razorpayRouteService: RazorpayRouteService;
//# sourceMappingURL=razorpayRoute.service.d.ts.map