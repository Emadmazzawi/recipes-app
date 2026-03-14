// Expo configuration
// Using EXPO_PUBLIC_ prefix ensures variables are available in the client bundle.
// We also expose it via extra for access through expo-constants.

export default {
  name: "Recipe Scaler",
  slug: "recipes-app",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.yourname.recipesapp"
  },
  android: {
    package: "com.yourname.recipesapp"
  },
  web: {
    bundler: "metro"
  },
  plugins: [
    "expo-router"
  ],
  scheme: "recipesapp",
  extra: {
    eas: {
      projectId: "f80cef06"
    },
    geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY
  }
};
