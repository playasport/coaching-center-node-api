"use strict";
/**
 * Payment Service Module
 *
 * This module provides a unified interface for payment gateway operations.
 * It allows easy switching between different payment gateways without changing
 * the business logic in booking service.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayGateway = exports.getPaymentService = exports.PaymentGatewayType = exports.PaymentService = void 0;
var PaymentService_1 = require("./PaymentService");
Object.defineProperty(exports, "PaymentService", { enumerable: true, get: function () { return PaymentService_1.PaymentService; } });
Object.defineProperty(exports, "PaymentGatewayType", { enumerable: true, get: function () { return PaymentService_1.PaymentGatewayType; } });
Object.defineProperty(exports, "getPaymentService", { enumerable: true, get: function () { return PaymentService_1.getPaymentService; } });
var RazorpayGateway_1 = require("./gateways/RazorpayGateway");
Object.defineProperty(exports, "RazorpayGateway", { enumerable: true, get: function () { return RazorpayGateway_1.RazorpayGateway; } });
//# sourceMappingURL=index.js.map