# Razorpay Route Feature Setup Guide

## Error: "Route feature not enabled for the merchant"

यह error तब आता है जब आपके Razorpay merchant account में **Route feature enable नहीं है**।

## Route Feature क्या है?

Razorpay Route एक feature है जो आपको payments को multiple accounts में automatically transfer करने की सुविधा देता है। Academy payout system के लिए यह जरूरी है।

## Route Feature Enable कैसे करें?

### Option 1: Razorpay Dashboard से Enable करें (अगर available हो)

1. Razorpay Dashboard में login करें: https://dashboard.razorpay.com
2. **Settings** → **Account & Settings** पर जाएं
3. **Features** section में **Route** feature को enable करें
4. अगर Route option नहीं दिख रहा, तो Option 2 follow करें

### Option 2: Razorpay Support से Contact करें

Route feature enable करने के लिए Razorpay support team से contact करना होगा:

1. **Email Support:**
   - Email: support@razorpay.com
   - Subject: "Enable Route Feature for Merchant Account"
   - Body में mention करें:
     - Your Merchant ID
     - Use case (Academy payout system)
     - Business details

2. **Dashboard Support:**
   - Dashboard में **Help & Support** section में ticket create करें
   - Request: "Please enable Route feature for my merchant account"

3. **Phone Support:**
   - Razorpay support number: 1800-258-5858 (India)
   - Mention: "I need Route feature enabled for payouts"

## Test Mode vs Live Mode

### Test Mode में Route Feature:

- Test Mode में भी Route feature enable करना होता है
- Test Mode API keys use करें:
  - Dashboard → Settings → API Keys → **Test Mode Keys**
- Test Mode में real money transfer नहीं होता, सिर्फ testing होती है

### Live Mode में Route Feature:

- Production में use करने से पहले Live Mode में Route enable करें
- Live Mode API keys use करें:
  - Dashboard → Settings → API Keys → **Live Mode Keys**

## API Keys Configuration

### Environment Variables:

```env
# Test Mode (Development)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_test_key_secret

# Live Mode (Production)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_live_key_secret
```

### Important Notes:

1. **Test Mode Keys** start with `rzp_test_`
2. **Live Mode Keys** start with `rzp_live_`
3. Test और Live mode के keys अलग-अलग होते हैं
4. Route feature दोनों modes में separately enable करना होता है

## Verification Steps

Route feature enable होने के बाद verify करें:

1. **Dashboard Check:**
   - Dashboard में **Route** tab दिखना चाहिए
   - **Linked Accounts** section available होना चाहिए

2. **API Test:**
   ```bash
   # Test API call
   curl -X POST https://api.razorpay.com/v2/accounts \
     -u YOUR_KEY_ID:YOUR_KEY_SECRET \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "phone": "9999999999",
       "type": "route",
       "legal_business_name": "Test Business",
       "business_type": "individual"
     }'
   ```

3. **Success Response:**
   - Status: 200 OK
   - Response में `id` field मिलना चाहिए
   - Error नहीं आना चाहिए

## Common Issues

### Issue 1: "Route feature not enabled"
**Solution:** Razorpay support से contact करें और Route feature enable करवाएं

### Issue 2: "Invalid API keys"
**Solution:** 
- Check करें कि correct mode (test/live) के keys use हो रहे हैं
- Keys expire नहीं हुए हों
- Keys में spaces या extra characters न हों

### Issue 3: "Account already exists"
**Solution:** 
- Same email/phone से account already create है
- Different email/phone use करें या existing account use करें

## Support Resources

- **Razorpay Documentation:** https://razorpay.com/docs/api/route/
- **Razorpay Support:** support@razorpay.com
- **Dashboard:** https://dashboard.razorpay.com
- **Route API Docs:** https://razorpay.com/docs/api/route/accounts/

## Next Steps

Route feature enable होने के बाद:

1. ✅ Test Mode में account create करके test करें
2. ✅ Bank details add करें
3. ✅ Stakeholder create करें (अगर needed)
4. ✅ Product configuration request करें
5. ✅ Test transfer करें
6. ✅ Live Mode में deploy करने से पहले Live Mode में भी enable करवाएं

## Important Notes

⚠️ **Route feature enable होने में 1-2 business days लग सकते हैं**

⚠️ **Test Mode और Live Mode में separately enable करना होता है**

⚠️ **Route feature enable होने के बाद ही Linked Accounts create हो सकते हैं**
