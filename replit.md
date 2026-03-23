# Recipe Scaler

An AI-powered mobile app for managing, scaling, and discovering recipes. Built with Expo/React Native and runs on web via Expo Web.

## Tech Stack

- **Framework**: Expo (v54) / React Native 0.81.5
- **Language**: TypeScript
- **AI Engine**: Google Gemini AI (`gemini-1.5-flash`) for OCR, smart search, and URL import
- **Backend/Auth**: Supabase (`@supabase/supabase-js`)
- **Navigation**: Expo Router (file-based routing)
- **Bundler**: Metro (default for React Native/Expo)
- **Package Manager**: npm

## Project Layout

```
app/
  _layout.tsx          # Root layout
  auth/                # Authentication screens (login/signup)
  (tabs)/              # Main tab navigation (Home, My Recipes)
  recipe/              # Recipe detail ([id].tsx) and create (new.tsx)
assets/                # Icons, splash screen, favicon
components/            # Reusable UI components (RecipeCard, IngredientRow, etc.)
constants/             # Demo recipe data
lib/
  gemini.ts            # AI functions (scan, search, import from URL)
  supabase.ts          # Supabase client + auth
  scaler.ts            # Recipe scaling utilities
  nutrition.ts         # Nutritional estimation
types/                 # TypeScript interfaces
```

## Environment Variables

The app requires these secrets (set via Replit Secrets):

- `EXPO_PUBLIC_GEMINI_API_KEY` — Google Gemini API key for AI features
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key

Without Supabase keys, auth and cloud sync are disabled but the app still runs with local/demo data.

## Workflow

- **Start application**: `npx expo start --web --port 5000`
  - Runs the Expo dev server in web mode on port 5000
  - Hot Module Reloading (HMR) is enabled — no restart needed for code changes
  - QR code available via Expo Go for testing on physical devices

## Development Notes

- Never edit `package.json` directly — use the package management tools
- Never run `npx expo start` directly in shell — use the workflow tools
- The Expo web bundler (Metro) serves the app at port 5000
- `react-dom` and `react-native-web` are required for web mode
