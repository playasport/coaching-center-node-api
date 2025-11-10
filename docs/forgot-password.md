## Forgot Password Flow

The password reset feature supports both mobile and email channels. The overall process is the same for both: request an OTP, verify the OTP with the new password, and the user receives a fresh JWT on success.

---

### 1. Request Reset (OTP generation)

- **Mobile**  
  `POST /academy/auth/forgot-password/request`  
  ```json
  {
    "mode": "mobile",
    "mobile": "9876543210"
  }
  ```
  - Verifies the mobile belongs to an academy account.
  - Generates a 6-digit OTP valid for 5 minutes.
  - Sends the OTP via SMS (respects `SMS_ENABLED` and Twilio config).

- **Email**  
  `POST /academy/auth/forgot-password/request`  
  ```json
  {
    "mode": "email",
    "email": "academy@example.com"
  }
  ```
  - Checks the email against existing users.
  - Generates an OTP (same expiry).
  - Sends an HTML email (Gmail SMTP; see `EMAIL_*` env variables) using the `password-reset.html` template.

Both requests return 200 with:
```json
{ "success": true, "message": "...", "data": { "mode": "mobile|email" } }
```

---

### 2. Verify OTP & Set New Password

`POST /academy/auth/forgot-password/verify`

- **Mobile**
  ```json
  {
    "mode": "mobile",
    "mobile": "9876543210",
    "otp": "123456",
    "newPassword": "StrongPass@123"
  }
  ```

- **Email**
  ```json
  {
    "mode": "email",
    "email": "academy@example.com",
    "otp": "123456",
    "newPassword": "StrongPass@123"
  }
  ```

**Validation:**
- `newPassword` must pass the same complexity rules enforced during registration (min length 6, must include upper/lower/numeric/special).
- OTP is checked via the shared `otpService` (channel + `forgot_password` mode).

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {
    "user": { ...sanitized user... },
    "token": "<jwt>"
  }
}
```
- User receives a new JWT immediately after password reset.

---

### 3. Optional: Reuse `verify-otp` for login

- `POST /academy/auth/verify-otp` with `mode: "login"` now returns the same `{ user, token }` payload used during email/password login.
- `academyAuth.controller.ts` houses the logic for all flows (send OTP, verify OTP).

---

### Configuration Recap

| Variable              | Purpose                                   | Default            |
| --------------------- | ----------------------------------------- | ------------------ |
| `EMAIL_ENABLED`       | Toggle email delivery                     | `true`             |
| `EMAIL_HOST`          | SMTP host (Gmail)                         | `smtp.gmail.com`   |
| `EMAIL_PORT`          | SMTP port                                 | `587`              |
| `EMAIL_USERNAME`      | Gmail user                                | `""`               |
| `EMAIL_PASSWORD`      | Gmail app password                        | `""`               |
| `EMAIL_FROM`          | From address                              | `""`               |
| `SMS_ENABLED`         | Toggle SMS delivery                       | `true`             |
| `TWILIO_*`            | Twilio credentials                        | `""`               |

---

### Templates

- OTP email template: `src/email/templates/otp.html`
- Password reset email template: `src/email/templates/password-reset.html`
- Both use token placeholders (e.g., `{{otp}}`, `{{name}}`, `{{expiryMinutes}}`).

---

### Quick Sequence Diagram

```
User -> API: POST /forgot-password/request
API -> OTP Service: generate OTP (mode: forgot_password)
API -> SMS/Email: deliver OTP
User -> API: POST /forgot-password/verify (OTP + new password)
API -> OTP Service: verify OTP
API -> User Service: update password
API -> User: respond { user, token }
```


