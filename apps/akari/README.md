# Akari v2 - React Native App

This is a [React Native](https://reactnative.dev) project built with [Expo](https://expo.dev) that includes secure authentication and data management.

## Features

- 🔐 **Secure Storage** - Encrypted JWT token storage using react-native-mmkv
- 🔄 **TanStack Query** - Efficient data fetching and caching
- 🎨 **Themed UI** - Light/dark mode support
- 📱 **Cross-platform** - iOS, Android, and Web support
- 🎬 **GIF Support** - Tenor GIF integration for enhanced posts

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## App Variants

The Expo configuration supports separate application IDs for each build profile so you can install development, preview, and production builds on the same device. Select the variant by setting the `APP_VARIANT` environment variable when running Expo commands. If the variable is not provided the configuration defaults to `development`.

Available variants:

- `development` → bundle/package `works.lucidsoft.akari.dev`
- `preview` → bundle/package `works.lucidsoft.akari.preview`
- `production` → bundle/package `works.lucidsoft.akari`

Examples:

```bash
APP_VARIANT=development npx expo start
APP_VARIANT=preview npx expo run:android
APP_VARIANT=production npx expo run:ios
```

Workspace scripts are available if you prefer not to set `APP_VARIANT` manually:

```bash
npm run start:preview --workspace apps/akari
npm run android:production --workspace apps/akari
npm run ios:development --workspace apps/akari
```

From the repository root you can run the Turbo-powered aliases:

```bash
npm run start:preview
npm run android:preview
npm run ios:production
```

EAS build profiles in `eas.json` export the correct `APP_VARIANT` automatically.

## 🔐 Secure Storage Configuration

### Development Setup

The app uses react-native-mmkv for encrypted storage of sensitive data like JWT tokens. A development encryption key is already configured.

### Production Setup

**IMPORTANT**: Before deploying to production, you must replace the encryption key in `utils/secureStorage.ts`:

1. **Generate a secure encryption key**:

   ```bash
   # Generate a 32-byte random key (256 bits)
   openssl rand -hex 32
   ```

2. **Replace the encryption key** in `utils/secureStorage.ts`:

   ```typescript
   export const secureStorage = new MMKV({
     id: 'secure-storage',
     encryptionKey: process.env.MMKV_ENCRYPTION_KEY || 'your-secure-production-key-here',
   });
   ```

3. **Set up environment variables** (recommended):
   - Create a `.env` file (add to .gitignore)
   - Add your encryption key: `MMKV_ENCRYPTION_KEY=your-generated-key`
   - Use a secure key management service for production

### Security Best Practices

- ✅ Never commit encryption keys to version control
- ✅ Use environment variables for production keys
- ✅ Generate cryptographically secure random keys
- ✅ Rotate keys periodically in production
- ✅ Use different keys for different environments (dev/staging/prod)

## Authentication System

The app includes a complete authentication system with:

- **Sign In/Sign Up pages** with form validation
- **Secure JWT token storage** with encryption
- **Automatic token persistence** across app restarts
- **User data management** (ID, email, etc.)

### Authentication Flow

1. User enters credentials on sign-in/sign-up page
2. App validates credentials and receives JWT token
3. Token is securely stored using encrypted MMKV storage
4. App checks for existing token on startup
5. User remains authenticated until logout or token expiration

### API Integration

To integrate with your backend API:

```typescript
import { jwtStorage } from '@/utils/secureStorage';

// After successful login
jwtStorage.setToken(response.accessJwt);
jwtStorage.setUserData(response.did, response.handle);

// For API calls
const token = jwtStorage.getToken();
// Add to Authorization header: `Bearer ${token}`

// Check authentication status
if (jwtStorage.isAuthenticated()) {
  // User is logged in
}

// Logout
jwtStorage.clearAuth();
```

## Project Structure

```
akari-v2/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication pages
│   │   ├── signin.tsx     # Sign in page
│   │   └── signup.tsx     # Sign up page
│   └── (home,search,notifications,messages,post,profile)/   # Main app tabs
├── components/             # Reusable components
├── utils/                  # Utilities
│   └── secureStorage.ts   # Secure storage configuration
└── constants/              # App constants
```

## Development

### Available Scripts

- `npm start` - Start the development server
- `npm run android` - Start on Android
- `npm run ios` - Start on iOS
- `npm run web` - Start on Web
- `npm run lint` - Run ESLint

### Environment Setup

1. **Development**: Uses default encryption key
2. **Production**: Must set `MMKV_ENCRYPTION_KEY` environment variable
3. **Testing**: Can use different keys for different test environments

## Deployment Checklist

Before deploying to production:

- [ ] Replace encryption key with secure random key
- [ ] Set up environment variables for production
- [ ] Configure your backend API endpoints
- [ ] Test authentication flow end-to-end
- [ ] Verify secure storage works across app restarts
- [ ] Test on both iOS and Android devices

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [React Native documentation](https://reactnative.dev/)
- [TanStack Query documentation](https://tanstack.com/query)
- [MMKV documentation](https://github.com/mrousavy/react-native-mmkv)

## Security Notes

- The encryption key in `utils/secureStorage.ts` is for development only
- Never use the default key in production
- Always use cryptographically secure random keys
- Consider using a secure key management service for production
- Regularly rotate encryption keys
- Monitor for security vulnerabilities in dependencies
