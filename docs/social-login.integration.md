# PlayAsport Academy API – Integration Guide

This guide walks you through the essentials required to integrate with the PlayAsport Academy backend. It focuses on authentication flows (traditional and social), environment setup, and recommended usage patterns for clients such as web or mobile apps.

---

## 1. Environment & Dependencies

### API Base URL
- Development: `http://localhost:3000/api/v1`
- Production: configure according to deployment. Swagger UI is available at `/api-docs`.

### Required Environment Variables
Set the following variables before booting the API:

```bash
PORT=3000
NODE_ENV=development
DEFAULT_LOCALE=en

JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

MONGO_URI=mongodb://localhost:27017/coaching_center_panel
```

### Firebase Credentials File
Social login relies on the Firebase Admin SDK. Instead of environment variables, place the service-account JSON directly at `src/config/firebase-credentials.json`.

Steps:
1. In the Firebase Console, go to **Project Settings → Service Accounts**.
2. Click **Generate New Private Key** and download the JSON file.
3. Save or copy the JSON file to `src/config/firebase-credentials.json` in this project.
4. Ensure the file remains secure (do not commit sensitive credentials to version control unless intentionally shared in a secure environment).
5. Restart the server so the new credentials are loaded.

### Installing Dependencies
```bash
npm install
npm run dev
```

---

## 2. Authentication Flows

### 2.1 Password-Based Login (Existing Flow)
- **Endpoint:** `POST /academy/auth/login`
- **Payload:**
  ```json
  {
    "email": "academy@example.com",
    "password": "StrongPass@123"
  }
  ```
- **Response:** `UserTokenResponse` containing the authenticated user and a JWT token.

Use the returned JWT as a `Bearer` token for subsequent authenticated requests.

### 2.2 Social Login via Firebase (New)
- **Endpoint:** `POST /academy/auth/social-login`
- **Purpose:** Authenticate or auto-register academy users using Firebase-supported providers (Google, Facebook, Instagram, Apple).
- **Payload:**
  ```json
  {
    "provider": "google", // optional hint
    "idToken": "FIREBASE_ID_TOKEN",
    "firstName": "John",  // optional overrides
    "lastName": "Doe"
  }
  ```
- **Response:** `UserTokenResponse` with `user`, `token`, and `provider`.
- **Important Notes:**
  - The backend verifies the Firebase `idToken` using Admin SDK.
  - If the email does not exist, a new academy user is created automatically.
  - Ensure your Firebase project has each provider enabled and your frontend retrieves a valid ID token before calling the API.
  - The `provider` field is optional; token verification relies solely on Firebase.

---

## 3. Firebase Configuration

1. **Enable Providers**
   - In the Firebase Console, navigate to **Authentication → Sign-in method**.
   - Enable Google, Facebook, Apple, and any other required provider.
   - For Facebook & Apple, configure OAuth redirect URIs and secrets.

2. **Service Account**
   - Go to **Project Settings → Service Accounts**.
   - Generate a new private key.
   - Copy `project_id`, `client_email`, and `private_key` into your API environment variables.

3. **Client Applications**
   - Web or mobile apps obtain Firebase ID tokens after successful provider login.
   - Send the ID token to `POST /academy/auth/social-login`.

---

### 3.1 Obtaining Firebase ID Tokens on the Client

Below are sample approaches for generating an ID token from Firebase after a user authenticates with a social provider.

#### Web (Firebase v9 Modular SDK)
```bash
npm install firebase
```

```ts
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: '<FIREBASE_API_KEY>',
  authDomain: '<your-app>.firebaseapp.com',
  projectId: '<FIREBASE_PROJECT_ID>',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);

  const idToken = await result.user.getIdToken(/* forceRefresh */ false);

  // Send idToken to backend
  const response = await fetch('<API_BASE_URL>/academy/auth/social-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider: 'google',
      idToken,
      firstName: result.user.displayName?.split(' ')[0],
      lastName: result.user.displayName?.split(' ').slice(1).join(' '),
    }),
  });

  return response.json();
};
```

#### React Native (Expo / Firebase JS SDK)
```bash
npm install firebase expo-auth-session
```

Use Expo or appropriate provider SDK to sign in, then:
```ts
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';

// After obtaining an OAuth response
const credential = GoogleAuthProvider.credential(idToken, accessToken);
const authResult = await signInWithCredential(auth, credential);
const firebaseIdToken = await authResult.user.getIdToken();
```

#### Android Native (Kotlin)
```kotlin
FirebaseAuth.getInstance()
    .signInWithCredential(credential)
    .addOnCompleteListener { task ->
        if (task.isSuccessful) {
            task.result?.user?.getIdToken(false)
                ?.addOnSuccessListener { tokenResult ->
                    val idToken = tokenResult.token
                    // POST idToken to backend
                }
        }
    }
```

#### iOS Native (Swift)
```swift
Auth.auth().signIn(with: credential) { authResult, error in
    guard error == nil, let user = authResult?.user else { return }

    user.getIDToken { idToken, error in
        guard error == nil, let idToken = idToken else { return }
        // POST idToken to backend
    }
}
```

In each case, send the `idToken` to the API’s `/academy/auth/social-login` endpoint. The backend verifies the token using Firebase Admin SDK and returns a JWT for subsequent requests.

---

## 4. Postman Collection

- File: `docs/postman_collection.json`
- Import into Postman to access predefined requests for:
  - Registration & login
  - OTP flows
  - Profile updates (including address)
  - Social login
  - Locale management

Update the collection variable `base_url` to match your environment and set the `token` variable after authenticating.

---

## 5. Social Login Demo Page

- Visit `http://localhost:3000/api/v1/demo/social-login` to open the interactive client.
- Paste your Firebase web configuration, specify the backend base URL, and exercise Google, Facebook, or Apple login flows.
- The page captures the Firebase ID token, forwards it to `/academy/auth/social-login`, and displays both the raw API response and the decoded JWT payload for validation.

---

## 6. Swagger Documentation

- Hosted under `/api-docs`.
- Contains schemas for requests & responses, including the new `AcademySocialLoginRequest`.
- Use Swagger UI to explore endpoints, generate client stubs, or share with integrators.

---

## 7. Error Handling & Logging

- Responses follow the `ApiResponse` schema with `success`, `message`, and optional `data`.
- In production, logs are written to `logs/application.log` and include contextual metadata.
- In development, logs are sent to the console.

---

## 8. Recommended Integration Steps

1. **Configure Firebase providers** and generate the Admin SDK credentials.
2. **Set environment variables** for MongoDB, JWT, and any optional services, then place the Firebase credentials JSON at `src/config/firebase-credentials.json`.
3. **Install dependencies** and run the API locally using `npm run dev`.
4. **Import the Postman collection**, set `base_url`, and execute sample requests.
5. **Implement frontend login flows** using Firebase client SDKs. Forward the obtained ID token to the backend.
6. **Handle JWT storage & refresh** in your client application (e.g., store token securely, refresh sessions as needed).
7. **Monitor logs** (`logs/application.log` in production) for troubleshooting.

---

## 9. Support

For questions or issues during integration:
- Refer to the Swagger docs (`/api-docs`).
- Examine API logs (`logs/application.log` in production).
- Contact the PlayAsport backend team with relevant request IDs/timestamps.

---

Happy building! 🚀

