# Mobile User Registration Flow with Temp Token - Frontend Integration Guide

## Overview

This document explains the mobile user registration flow for new users using temporary tokens. The flow is designed to provide a seamless registration experience where users can register after OTP verification without needing to re-enter their mobile number.

## Key Features

- **OTP-based Authentication**: No password required for user registration
- **Temporary Token Security**: Mobile number is extracted from the token (not from request body) to prevent tampering
- **Seamless Flow**: Single OTP verification for both login and registration
- **Device-Specific Tokens**: Support for device-specific refresh tokens (7 days for web, 90 days for mobile)
- **Token Expiry**: Temp token is valid for 30 minutes

## Registration Flow Diagram

```
┌─────────────┐
│   Step 1    │  User enters mobile number
│  Send OTP   │  → POST /api/v1/user/auth/send-otp
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Step 2    │  User enters OTP received via SMS
│  Verify OTP │  → POST /api/v1/user/auth/verify-otp
└──────┬──────┘
       │
       ├─── User exists → Login successful (returns accessToken & refreshToken)
       │
       └─── User doesn't exist → Returns needsRegistration: true & tempToken
            │
            ▼
┌─────────────┐
│   Step 3    │  User fills registration form
│  Register   │  → POST /api/v1/user/auth/register (with tempToken)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Success   │  User registered & logged in
│             │  Returns accessToken & refreshToken
└─────────────┘
```

## Step-by-Step Flow

### Step 1: Send OTP

**Endpoint:** `POST /api/v1/user/auth/send-otp`

**Purpose:** Request OTP to be sent to the user's mobile number.

**Request:**
```json
{
  "mobile": "9876543210",
  "mode": "login"
}
```

**Request Parameters:**
- `mobile` (required): Mobile number (10 digits, must start with 6, 7, 8, or 9)
- `mode` (optional): Default is `"login"`. Options: `"login"`, `"register"`, `"profile_update"`, `"forgot_password"`
  - Use `"login"` for the new registration flow (works for both existing and new users)

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "One-time password has been generated and sent.",
  "data": {
    "mobile": "+919876543210",
    "mode": "login"
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Mobile number must start with 6, 7, 8, or 9 and contain only digits"
}
```

**Frontend Implementation:**
```javascript
// Example: React/JavaScript
const sendOTP = async (mobileNumber) => {
  try {
    const response = await fetch('https://api.example.com/api/v1/user/auth/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile: mobileNumber,
        mode: 'login' // Use 'login' mode for new registration flow
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // OTP sent successfully
      // Show OTP input screen
      console.log('OTP sent to:', data.data.mobile);
    } else {
      // Handle error
      console.error('Error:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

---

### Step 2: Verify OTP

**Endpoint:** `POST /api/v1/user/auth/verify-otp`

**Purpose:** Verify the OTP and determine if user exists or needs registration.

**Request:**
```json
{
  "mobile": "9876543210",
  "otp": "123456",
  "mode": "login",
  "fcmToken": "fcm_token_here", // Optional
  "deviceType": "android", // Optional: "web" | "android" | "ios"
  "deviceId": "device_unique_id", // Optional
  "deviceName": "Samsung Galaxy S21", // Optional
  "appVersion": "1.0.0" // Optional
}
```

**Request Parameters:**
- `mobile` (required): Mobile number (same as used in send-otp)
- `otp` (required): 6-digit OTP code received via SMS
- `mode` (optional): Default is `"login"`
- `fcmToken` (optional): FCM token for push notifications
- `deviceType` (optional): Device type for device-specific tokens
- `deviceId` (optional): Unique device identifier
- `deviceName` (optional): Device name
- `appVersion` (optional): App version

**Response Scenarios:**

#### Scenario A: User Exists (Login Successful)

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id_123",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "mobile": "9876543210",
      "type": "student",
      "gender": "male",
      "dob": "2000-01-15",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Action:** User is logged in. Store tokens and redirect to home/dashboard.

#### Scenario B: User Doesn't Exist (Registration Required)

**Response (200):**
```json
{
  "success": true,
  "message": "OTP verified. Please complete registration.",
  "data": {
    "needsRegistration": true,
    "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtb2JpbGUiOiI5ODc2NTQzMjEwIiwidHlwZSI6InJlZ2lzdHJhdGlvbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDAxODAwfQ.signature"
  }
}
```

**Action:** Store `tempToken` and redirect to registration form.

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

**Frontend Implementation:**
```javascript
// Example: React/JavaScript
const verifyOTP = async (mobileNumber, otpCode, deviceInfo = {}) => {
  try {
    const response = await fetch('https://api.example.com/api/v1/user/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile: mobileNumber,
        otp: otpCode,
        mode: 'login',
        ...deviceInfo // Include device info if available
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      if (data.data.needsRegistration) {
        // User doesn't exist - redirect to registration
        // Store tempToken securely
        localStorage.setItem('tempToken', data.data.tempToken);
        // Navigate to registration screen
        navigate('/register');
      } else if (data.data.accessToken) {
        // User exists - login successful
        // Store tokens
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        // Store user data
        localStorage.setItem('user', JSON.stringify(data.data.user));
        // Navigate to home/dashboard
        navigate('/home');
      }
    } else {
      // Handle error
      console.error('Error:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

---

### Step 3: Complete Registration

**Endpoint:** `POST /api/v1/user/auth/register`

**Purpose:** Register a new user using the temporary token received from verify-otp.

**Important Notes:**
- **DO NOT** send `mobile` in the request body when using `tempToken` - it's extracted from the token for security
- **DO NOT** send `otp` when using `tempToken` - the token already verifies OTP was validated
- `tempToken` is valid for **30 minutes** - ensure registration is completed within this time

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "type": "student",
  "dob": "2000-01-15",
  "gender": "male",
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtb2JpbGUiOiI5ODc2NTQzMjEwIiwidHlwZSI6InJlZ2lzdHJhdGlvbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDAxODAwfQ.signature",
  "fcmToken": "fcm_token_here",
  "deviceType": "android",
  "deviceId": "device_unique_id",
  "deviceName": "Samsung Galaxy S21",
  "appVersion": "1.0.0"
}
```

**Request Parameters:**

**Required Fields:**
- `firstName` (required): User's first name
- `email` (required): Valid email address (must be unique)
- `type` (required): User type - `"student"` or `"guardian"`
- `dob` (required): Date of birth in `YYYY-MM-DD` format
  - **Age Requirements:**
    - Minimum age for all users: **3 years**
    - Minimum age for students: **13 years**
    - Guardians: No maximum age limit
- `gender` (required): Gender - `"male"`, `"female"`, or `"other"`
- `tempToken` (required): Temporary registration token from verify-otp step

**Optional Fields:**
- `lastName`: User's last name
- `fcmToken`: FCM token for push notifications
- `deviceType`: Device type - `"web"`, `"android"`, or `"ios"`
- `deviceId`: Unique device identifier
- `deviceName`: Device name
- `appVersion`: App version

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id_123",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "mobile": "9876543210",
      "type": "student",
      "gender": "male",
      "dob": "2000-01-15",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (Error - 400):**

**Invalid/Expired Temp Token:**
```json
{
  "success": false,
  "message": "Invalid or expired temporary registration token"
}
```

**Email Already Exists:**
```json
{
  "success": false,
  "message": "Email already exists"
}
```

**Validation Error (Student Age):**
```json
{
  "success": false,
  "message": "Student must be at least 13 years old"
}
```

**Both Token and OTP Provided:**
```json
{
  "success": false,
  "message": "Cannot provide both tempToken and otp. Use tempToken for new registration flow or otp for legacy flow."
}
```

**Frontend Implementation:**
```javascript
// Example: React/JavaScript
const registerUser = async (registrationData, deviceInfo = {}) => {
  try {
    // Retrieve tempToken from storage
    const tempToken = localStorage.getItem('tempToken');
    
    if (!tempToken) {
      throw new Error('Temp token not found. Please verify OTP again.');
    }
    
    const response = await fetch('https://api.example.com/api/v1/user/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        email: registrationData.email,
        type: registrationData.type, // "student" or "guardian"
        dob: registrationData.dob, // YYYY-MM-DD format
        gender: registrationData.gender, // "male", "female", or "other"
        tempToken: tempToken, // From verify-otp step
        ...deviceInfo // Include device info if available
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Registration successful
      // Store tokens
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      // Store user data
      localStorage.setItem('user', JSON.stringify(data.data.user));
      // Clear tempToken
      localStorage.removeItem('tempToken');
      // Navigate to home/dashboard
      navigate('/home');
    } else {
      // Handle error
      if (data.message.includes('expired') || data.message.includes('Invalid')) {
        // Temp token expired - redirect to OTP verification
        localStorage.removeItem('tempToken');
        navigate('/verify-otp');
      }
      console.error('Registration error:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

---

## Complete Frontend Flow Example

### React/React Native Example

```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RegistrationFlow = () => {
  const [step, setStep] = useState(1); // 1: Mobile, 2: OTP, 3: Registration
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [registrationData, setRegistrationData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    type: 'student',
    dob: '',
    gender: 'male'
  });
  const navigate = useNavigate();

  // Step 1: Send OTP
  const handleSendOTP = async () => {
    try {
      const response = await fetch('https://api.example.com/api/v1/user/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, mode: 'login' })
      });
      
      const data = await response.json();
      if (data.success) {
        setStep(2); // Move to OTP verification step
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Failed to send OTP');
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    try {
      const deviceInfo = {
        deviceType: 'android', // or 'ios' or 'web'
        deviceId: getDeviceId(), // Your device ID function
        deviceName: getDeviceName(), // Your device name function
        appVersion: '1.0.0',
        fcmToken: await getFCMToken() // Your FCM token function
      };

      const response = await fetch('https://api.example.com/api/v1/user/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp, mode: 'login', ...deviceInfo })
      });
      
      const data = await response.json();
      if (data.success) {
        if (data.data.needsRegistration) {
          // User doesn't exist - proceed to registration
          setTempToken(data.data.tempToken);
          setStep(3);
        } else if (data.data.accessToken) {
          // User exists - login successful
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          localStorage.setItem('user', JSON.stringify(data.data.user));
          navigate('/home');
        }
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Failed to verify OTP');
    }
  };

  // Step 3: Register User
  const handleRegister = async () => {
    try {
      const deviceInfo = {
        deviceType: 'android',
        deviceId: getDeviceId(),
        deviceName: getDeviceName(),
        appVersion: '1.0.0',
        fcmToken: await getFCMToken()
      };

      const response = await fetch('https://api.example.com/api/v1/user/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...registrationData,
          tempToken: tempToken,
          ...deviceInfo
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Registration successful
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        navigate('/home');
      } else {
        if (data.message.includes('expired') || data.message.includes('Invalid')) {
          // Temp token expired - go back to OTP step
          alert('Registration token expired. Please verify OTP again.');
          setStep(2);
        } else {
          alert(data.message);
        }
      }
    } catch (error) {
      alert('Failed to register');
    }
  };

  return (
    <div>
      {step === 1 && (
        <div>
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="Enter mobile number"
          />
          <button onClick={handleSendOTP}>Send OTP</button>
        </div>
      )}
      
      {step === 2 && (
        <div>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            maxLength={6}
          />
          <button onClick={handleVerifyOTP}>Verify OTP</button>
        </div>
      )}
      
      {step === 3 && (
        <div>
          <input
            type="text"
            value={registrationData.firstName}
            onChange={(e) => setRegistrationData({...registrationData, firstName: e.target.value})}
            placeholder="First Name"
            required
          />
          <input
            type="text"
            value={registrationData.lastName}
            onChange={(e) => setRegistrationData({...registrationData, lastName: e.target.value})}
            placeholder="Last Name"
          />
          <input
            type="email"
            value={registrationData.email}
            onChange={(e) => setRegistrationData({...registrationData, email: e.target.value})}
            placeholder="Email"
            required
          />
          <select
            value={registrationData.type}
            onChange={(e) => setRegistrationData({...registrationData, type: e.target.value})}
          >
            <option value="student">Student</option>
            <option value="guardian">Guardian</option>
          </select>
          <input
            type="date"
            value={registrationData.dob}
            onChange={(e) => setRegistrationData({...registrationData, dob: e.target.value})}
            required
          />
          <select
            value={registrationData.gender}
            onChange={(e) => setRegistrationData({...registrationData, gender: e.target.value})}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <button onClick={handleRegister}>Register</button>
        </div>
      )}
    </div>
  );
};
```

---

## Error Handling

### Common Error Scenarios

1. **OTP Expired or Invalid**
   - **Action:** Allow user to resend OTP
   - **Message:** "Invalid or expired OTP. Please request a new one."

2. **Temp Token Expired**
   - **Action:** Redirect user back to OTP verification step
   - **Message:** "Registration token expired. Please verify OTP again."

3. **Email Already Exists**
   - **Action:** Show error and allow user to use different email
   - **Message:** "This email is already registered. Please use a different email."

4. **Age Validation Error**
   - **Action:** Show error and allow user to correct date of birth
   - **Message:** "Student must be at least 13 years old."

5. **Network Errors**
   - **Action:** Show retry option
   - **Message:** "Network error. Please check your connection and try again."

---

## Security Considerations

1. **Temp Token Storage**
   - Store `tempToken` securely (localStorage/sessionStorage for web, secure storage for mobile)
   - Clear `tempToken` after successful registration or expiration
   - Do not expose `tempToken` in logs or error messages

2. **Token Expiry**
   - Temp token expires in 30 minutes
   - Implement timeout handling in your UI
   - Redirect to OTP verification if token expires

3. **Mobile Number Security**
   - **DO NOT** send mobile number in registration request when using `tempToken`
   - Mobile number is extracted from the token server-side for security

4. **Token Management**
   - Store `accessToken` and `refreshToken` securely
   - Implement token refresh logic before access token expires
   - Clear tokens on logout

---

## Token Management

### Access Token
- **Expiry:** 15 minutes
- **Usage:** Include in `Authorization` header for authenticated requests
- **Format:** `Bearer <accessToken>`

### Refresh Token
- **Expiry:** 
  - Web: 7 days
  - Mobile (Android/iOS): 90 days
- **Usage:** Use to get new access token when it expires
- **Endpoint:** `POST /api/v1/user/auth/refresh-token`

### Temp Token
- **Expiry:** 30 minutes
- **Usage:** Only for registration step
- **Storage:** Store temporarily, clear after registration

---

## API Base URL

Update the base URL according to your environment:

- **Development:** `http://localhost:3000/api/v1`
- **Staging:** `https://staging-api.example.com/api/v1`
- **Production:** `https://api.example.com/api/v1`

---

## Testing

### Development Mode
- In development mode, OTP is always `111111`
- Use this for testing without actual SMS

### Test Scenarios

1. **New User Registration Flow**
   - Send OTP → Verify OTP → Receive tempToken → Register → Success

2. **Existing User Login Flow**
   - Send OTP → Verify OTP → Receive tokens → Login Success

3. **Token Expiry**
   - Wait 30 minutes after receiving tempToken → Try registration → Should fail with expired token error

4. **Invalid OTP**
   - Send OTP → Enter wrong OTP → Should fail with invalid OTP error

---

## Support

For issues or questions:
- Check API documentation: `/api-docs`
- Review error messages in responses
- Contact API support team

---

## Changelog

- **v1.0.0** (2024-01-01): Initial documentation for mobile user registration flow with temp token
