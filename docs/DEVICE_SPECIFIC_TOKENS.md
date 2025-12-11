# Device-Specific Refresh Tokens Implementation

## Overview

This implementation provides **device-specific refresh tokens** with **longer validity for mobile apps** while maintaining **short-lived access tokens** for security. This follows industry best practices for mobile app authentication.

## Token Strategy

### Access Tokens (Same for All Devices)
- **Validity**: 15 minutes (configurable via `JWT_ACCESS_EXPIRES_IN`)
- **Purpose**: Short-lived tokens for API requests
- **Security**: Limits damage if compromised
- **Usage**: Same for web, Android, and iOS

### Refresh Tokens (Device-Specific)

#### Web Applications
- **Validity**: 7 days (default, configurable via `JWT_REFRESH_EXPIRES_IN`)
- **Storage**: Browser (localStorage/sessionStorage)
- **Purpose**: Standard web session management

#### Mobile Applications (Android/iOS)
- **Validity**: 90 days (default, configurable via `JWT_MOBILE_REFRESH_EXPIRES_IN`)
- **Options**: 30d, 60d, 90d, 180d (configurable)
- **Storage**: Secure storage on device (Keychain/Keystore)
- **Purpose**: Long-term authentication without frequent re-login
- **Device Tracking**: Each device has its own refresh token

## Architecture

### 1. DeviceToken Model
Stores device information and refresh tokens:
- `fcmToken`: Firebase Cloud Messaging token
- `deviceType`: web, android, or ios
- `deviceId`: Unique device identifier
- `refreshToken`: Device-specific refresh token
- `refreshTokenExpiresAt`: Token expiration date
- `isActive`: Whether device session is active

### 2. Token Generation
- **Helper Function**: `generateTokensAndStoreDeviceToken()`
  - Detects device type from request
  - Generates tokens with appropriate expiry
  - Stores refresh token in DeviceToken collection
  - Links refresh token to specific device

### 3. Token Refresh Flow
1. Client sends refresh token
2. Server validates token and checks device token
3. Verifies device is still active
4. Generates new tokens with same device type
5. Updates device token with new refresh token
6. Blacklists old refresh token

### 4. Logout Flow
- **Single Device**: Revokes refresh token from device token
- **All Devices**: Deactivates all device tokens and blacklists all tokens

## Configuration

### Environment Variables

```env
# Access Token (same for all)
JWT_ACCESS_EXPIRES_IN=15m

# Refresh Token for Web (default)
JWT_REFRESH_EXPIRES_IN=7d

# Refresh Token for Mobile Apps (longer)
JWT_MOBILE_REFRESH_EXPIRES_IN=90d
```

### Options for Mobile Refresh Token Expiry
- `30d` - 30 days (moderate security)
- `60d` - 60 days (balanced)
- `90d` - 90 days (default, good UX)
- `180d` - 180 days (maximum, for banking apps with device lock)

## API Usage

### Registration/Login with Device Info

```json
POST /api/v1/academy/auth/login
{
  "email": "user@example.com",
  "password": "Password@123",
  "fcmToken": "fcm-token-here",
  "deviceType": "android",  // or "ios", "web"
  "deviceId": "unique-device-id",
  "deviceName": "Samsung Galaxy S21",
  "appVersion": "1.0.0"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJ...",  // 15 minutes
    "refreshToken": "eyJ..."   // 90 days for mobile, 7 days for web
  }
}
```

### Token Refresh

```json
POST /api/v1/academy/auth/refresh
{
  "refreshToken": "eyJ..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",  // New 15-minute token
    "refreshToken": "eyJ..."   // New refresh token (same expiry as original)
  }
}
```

### Logout (Single Device)

```json
POST /api/v1/academy/auth/logout
Authorization: Bearer {accessToken}
{
  "refreshToken": "eyJ..."  // Optional
}
```

- Revokes refresh token from device token
- Blacklists access and refresh tokens

### Logout All Devices

```json
POST /api/v1/academy/auth/logout-all
Authorization: Bearer {accessToken}
```

- Deactivates all device tokens
- Blacklists all tokens for user

## Mobile App Implementation

### Android (Kotlin/Java)

```kotlin
// Store refresh token securely
val keyStore = KeyStore.getInstance("AndroidKeyStore")
keyStore.load(null)
val keyGenerator = KeyGenerator.getInstance(
    KeyProperties.KEY_ALGORITHM_AES, 
    "AndroidKeyStore"
)
// Store refresh token in KeyStore

// Refresh token when access token expires
fun refreshAccessToken() {
    val refreshToken = getRefreshTokenFromSecureStorage()
    val response = apiService.refreshToken(refreshToken)
    saveTokens(response.accessToken, response.refreshToken)
}
```

### iOS (Swift)

```swift
// Store refresh token in Keychain
let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrAccount as String: "refreshToken",
    kSecValueData as String: refreshToken.data(using: .utf8)!
]
SecItemAdd(query as CFDictionary, nil)

// Refresh token when access token expires
func refreshAccessToken() {
    let refreshToken = getRefreshTokenFromKeychain()
    apiService.refreshToken(refreshToken) { result in
        switch result {
        case .success(let tokens):
            saveTokens(tokens.accessToken, tokens.refreshToken)
        case .failure(let error):
            // Handle error, may need to re-login
        }
    }
}
```

## Security Features

### 1. Device Tracking
- Each device has a unique refresh token
- Tokens are linked to device ID and FCM token
- Can revoke access per device

### 2. Token Rotation
- New refresh token issued on each refresh
- Old refresh token is blacklisted
- Prevents token reuse attacks

### 3. Device Validation
- Refresh token must match device token
- Device must be active
- Device token expiration checked

### 4. Secure Storage
- Mobile apps should use:
  - **Android**: KeyStore/EncryptedSharedPreferences
  - **iOS**: Keychain Services
  - **Web**: Secure HTTP-only cookies (preferred) or localStorage

## Benefits

### For Users
- ✅ Less frequent re-login on mobile apps
- ✅ Seamless experience across devices
- ✅ Can manage multiple devices independently

### For Security
- ✅ Short-lived access tokens limit exposure
- ✅ Device-specific tokens enable granular control
- ✅ Can revoke access per device
- ✅ Token rotation prevents reuse

### For Developers
- ✅ Single codebase for all platforms
- ✅ Flexible expiry configuration
- ✅ Device session management
- ✅ FCM token integration

## Migration Notes

### Existing Users
- Existing refresh tokens (7 days) continue to work
- New logins will get device-specific tokens
- Old tokens will expire naturally

### Backward Compatibility
- Web apps without device info get 7-day tokens (default)
- Mobile apps with device info get 90-day tokens
- All tokens work with existing refresh endpoint

## Best Practices

1. **Always send device info** on login/register for mobile apps
2. **Store refresh tokens securely** (Keychain/KeyStore)
3. **Implement token refresh** before access token expires
4. **Handle token expiration** gracefully (re-login flow)
5. **Revoke tokens** on logout and app uninstall
6. **Monitor device tokens** for suspicious activity

## Troubleshooting

### Token Not Refreshing
- Check device token is active
- Verify refresh token matches device token
- Check token expiration date

### Multiple Devices Issue
- Each device should have unique `deviceId`
- FCM tokens should be unique per device
- Check device token collection for duplicates

### Token Expired
- Mobile: 90 days (configurable)
- Web: 7 days (configurable)
- User needs to re-login after expiration

## Configuration Examples

### Banking App (High Security)
```env
JWT_MOBILE_REFRESH_EXPIRES_IN=30d
```

### Social Media App (User Experience)
```env
JWT_MOBILE_REFRESH_EXPIRES_IN=180d
```

### Standard App (Balanced)
```env
JWT_MOBILE_REFRESH_EXPIRES_IN=90d
```
