# Environment Variables Setup

This document explains how to configure environment variables for the PricePulse mobile app.

## Required Environment Variables

### API Configuration

- `EXPO_PUBLIC_API_URL` - The base URL of your backend API (default: `http://localhost:3000`)
- `EXPO_PUBLIC_API_TIMEOUT` - Request timeout in milliseconds (default: `10000`)

### Google OAuth (Optional)

- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` or `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` - Google OAuth web client ID
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` - Google OAuth iOS client ID
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` - Google OAuth Android client ID

### App Configuration (Optional)

- `EXPO_PUBLIC_ENVIRONMENT` - Environment name (development, staging, production)
- `EXPO_PUBLIC_DEBUG` - Enable debug mode (true/false)

## Setup Instructions

1. Create a `.env` file in the `mobile` directory (or use Expo's environment variable system)

2. Add your environment variables:

```env
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_API_TIMEOUT=10000

# Google OAuth (if needed)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-web-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id

# App Configuration
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_DEBUG=false
```

3. For Expo projects, you can also set environment variables in:
   - `app.json` under `extra`
   - `eas.json` for EAS builds
   - Command line: `EXPO_PUBLIC_API_URL=http://api.example.com npx expo start`

## Important Notes

- All environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the app
- Environment variables are embedded at build time, not runtime
- After changing environment variables, you may need to restart the Expo development server
- For production builds, set environment variables in your CI/CD pipeline or EAS build configuration

## API Health Check

The app automatically performs health checks on the API endpoint before making requests. If the API is unreachable, users will see appropriate error messages.

The health check endpoint is: `{API_URL}/health`

## Validation

The app validates configuration on startup. Check the console for any configuration warnings.

