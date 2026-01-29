# Admin Payout System - Quick Reference

## API Endpoints Summary

### Payout Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/payouts` | List payouts with filters |
| `GET` | `/admin/payouts/stats` | Get payout statistics |
| `GET` | `/admin/payouts/:id` | Get payout details |
| `POST` | `/admin/payouts/:id/transfer` | Create transfer (manual) |
| `POST` | `/admin/payouts/:id/retry` | Retry failed transfer |
| `PATCH` | `/admin/payouts/:id/cancel` | Cancel payout |

### Refund Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/admin/payouts/bookings/:bookingId/refund` | Create refund |
| `GET` | `/admin/payouts/refunds/:refundId` | Get refund details |

---

## Payout Status Flow

### Payout Model Status
```
PENDING → PROCESSING → COMPLETED
   ↓           ↓
CANCELLED    FAILED (can retry)
   ↓
REFUNDED
```

### Booking Model payout_status
```
NOT_INITIATED → PENDING → PROCESSING → COMPLETED
       ↓           ↓           ↓
    CANCELLED    FAILED    REFUNDED (on full refund)
```

---

## Common Operations

### 1. List Pending Payouts
```bash
GET /admin/payouts?status=pending&page=1&limit=20
```

### 2. Initiate Transfer
```bash
POST /admin/payouts/{payoutId}/transfer
```

### 3. Create Full Refund
```bash
POST /admin/payouts/bookings/{bookingId}/refund
{
  "reason": "Booking cancelled"
}
```

### 4. Create Partial Refund
```bash
POST /admin/payouts/bookings/{bookingId}/refund
{
  "amount": 1000,
  "reason": "Partial service not provided"
}
```

### 5. Get Statistics
```bash
GET /admin/payouts/stats?dateFrom=2026-01-01&dateTo=2026-01-31
```

---

## Status Values

### Payout Status
- `pending` - Waiting for admin to initiate transfer
- `processing` - Transfer initiated, waiting for Razorpay
- `completed` - Transfer successful
- `failed` - Transfer failed (can retry)
- `cancelled` - Cancelled by admin
- `refunded` - Refunded (booking refunded)

---

## Error Codes

| Status | Error | Solution |
|--------|-------|----------|
| 400 | Payout account not activated | Activate academy payout account |
| 400 | Payout account not ready | Ensure account is ready for payouts |
| 400 | Invalid payout status | Check payout status before operation |
| 400 | Transfer already exists | Don't retry if already processing |
| 404 | Payout not found | Verify payout ID |
| 500 | Insufficient balance | Add funds to merchant account |

---

## Webhook Events

| Event | Action |
|-------|--------|
| `transfer.processed` | Update payout to `completed` |
| `transfer.failed` | Update payout to `failed` |
| `refund.processed` | Adjust/cancel payout |
| `refund.failed` | Log failure |

---

## Queue Jobs

| Queue | Purpose | Trigger |
|-------|---------|---------|
| `payout-creation` | Create payout record | Auto (payment verified) |
| `payout-transfer` | Process transfer | Manual (admin API) |

---

## Important Notes

1. **Payout Creation**: Automatic when payment verified (non-blocking)
2. **Transfer Creation**: Manual by admin (processed in background)
3. **Refund**: Automatically adjusts/cancels payout
4. **Webhooks**: Update status automatically from Razorpay
5. **Audit Trails**: All operations are logged
6. **Notifications**: Sent via Push, SMS, Email, WhatsApp

---

## Quick Checklist

Before initiating transfer:
- [ ] Payout account is activated
- [ ] Payout account is ready (`ready_for_payout: 'ready'`)
- [ ] Payout status is `pending` or `failed`
- [ ] Merchant account has sufficient balance
- [ ] Payout amount > 0

Before creating refund:
- [ ] Booking status is `confirmed`
- [ ] Payment status is `success`
- [ ] Refund amount ≤ booking amount
- [ ] Clear refund reason provided

---

For detailed documentation, see [ADMIN_PAYOUT_SYSTEM_GUIDE.md](./ADMIN_PAYOUT_SYSTEM_GUIDE.md)
