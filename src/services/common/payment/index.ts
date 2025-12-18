/**
 * Payment Service Module
 * 
 * This module provides a unified interface for payment gateway operations.
 * It allows easy switching between different payment gateways without changing
 * the business logic in booking service.
 */

export { PaymentService, PaymentGatewayType, getPaymentService } from './PaymentService';
export { RazorpayGateway } from './gateways/RazorpayGateway';
export type {
  IPaymentGateway,
  PaymentGatewayCredentials,
  CreateOrderData,
  PaymentOrderResponse,
  PaymentDetails,
} from './interfaces/IPaymentGateway';

