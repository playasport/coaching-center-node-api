# PlayAsport API Postman Collection

This Postman collection contains all the API endpoints for the PlayAsport Academy backend, including the new Booking and Payment endpoints.

## Import Instructions

1. Open Postman
2. Click **Import** button
3. Select the `PlayAsport-API-Collection.json` file
4. The collection will be imported with all endpoints

## Setup

### Environment Variables

The collection uses the following variables:

- `baseUrl`: API base URL (default: `http://localhost:3000/api/v1`)
- `accessToken`: JWT access token for authenticated requests

### Authentication

1. Use the **User Login** endpoint to authenticate
2. Copy the `accessToken` from the response
3. Set it in the collection variable `accessToken`
4. All authenticated endpoints will automatically use this token

## Collection Structure

### Booking Endpoints

1. **Get Booking Summary**
   - Get booking summary before creating an order
   - Requires: `batchId` and `participantIds` (comma-separated) as query parameters
   - Returns: Batch details, participants info, and calculated amount

2. **Create Order**
   - Create a Razorpay payment order
   - Requires: `batchId`, `participantIds` (array), and optional `notes`
   - Returns: Booking record and Razorpay order details

3. **Verify Payment**
   - Verify Razorpay payment signature
   - Requires: `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`
   - Returns: Updated booking record with confirmed status

### Webhook Endpoints

1. **Razorpay Webhook**
   - Webhook endpoint for Razorpay payment events
   - Automatically verifies payments and updates booking status
   - Requires: `X-Razorpay-Signature` header
   - Handles: `payment.captured`, `payment.failed`, `order.paid` events

## Testing Flow

1. **Login**: Use the User Login endpoint to get an access token
2. **Get Summary**: Get booking summary for a batch and participant
3. **Create Order**: Create a Razorpay order for the booking
4. **Payment**: Complete payment on Razorpay (use Razorpay test credentials)
5. **Verify Payment**: Verify the payment using the signature from Razorpay
6. **Webhook**: The webhook will automatically update the booking if payment succeeds

## Notes

- All booking routes start with `/user/booking`
- Webhook endpoint is at `/webhook/razorpay`
- Webhook does not require authentication (called by Razorpay)
- Replace placeholder values (ObjectIds, etc.) with actual values from your database

## Razorpay Test Credentials

For testing, use Razorpay test mode:
- Key ID: Available in Razorpay Dashboard → Settings → API Keys
- Key Secret: Available in Razorpay Dashboard → Settings → API Keys
- Test Cards: Available in Razorpay Documentation

