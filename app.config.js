// Expo configuration
export default {
  name: "Recipe Scaler",
  slug: "recipes-app",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash-screen.png",
    resizeMode: "contain",
    backgroundColor: "#0a0a0f"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.emadmazzawi.recipesapp"
  },
  android: {
    package: "com.emadmazzawi.recipesapp",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0a0a0f"
    }
  },
  web: {
    bundler: "metro",
    favicon: "./assets/favicon.png"
  },
  plugins: [
    "expo-router",
    [
      "@sentry/react-native/expo",
      {
        url: "https://sentry.io/",
        project: "recipes-app",
        organization: "your-organization-name"
      }
    ]
  ],
  scheme: "recipesapp",
  extra: {
    eas: {
      projectId: "f80cef06-1ee4-4313-ba90-90dd41d591a4"
    },
    // We provide these as explicit extra keys to ensure they are available in standalone builds
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  }
};
