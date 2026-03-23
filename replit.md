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
  _layout.tsx          # Root layout (Stack: tabs, auth, recipe/[id], recipe/new, recipe/cook)
  auth/                # Authentication screens (login/signup)
  (tabs)/              # Three-tab navigation: Explore, Library, Shopping
    index.tsx          # Explore/Discover built-in recipes with AI smart search
    my-recipes.tsx     # Personal recipe library with search + edit
    shopping.tsx       # Shopping list with checkbox, group-by-recipe
    _layout.tsx        # Tab bar config (Explore, Library, Shopping)
  recipe/
    [id].tsx           # Recipe detail: photo hero, scale presets, cook mode, shopping list
    new.tsx            # Create/Edit recipe form with photo picker + AI scan
    cook.tsx           # Step-by-step cooking mode with per-step timer
assets/                # Icons, splash screen, favicon
components/
  RecipeCard.tsx       # Card with onPress, onDelete, onEdit, onToggleFavorite
  IngredientRow.tsx    # Editable ingredient with inline amount editing
  Skeleton.tsx         # Loading skeleton components
constants/             # Demo recipe data + categories
lib/
  gemini.ts            # AI: scanIngredientsFromImage, smartSearchRecipes, importRecipeFromUrl
  supabase.ts          # Supabase client + auth
  scaler.ts            # Recipe scaling utilities
  nutrition.ts         # USDA FDC nutritional estimation with in-memory cache
  storage.ts           # AsyncStorage + Supabase CRUD: recipes, favorites, shopping list
types/                 # TypeScript interfaces (Recipe, Ingredient, ShoppingItem, Unit)
```

## Key Features

- **Recipe Library**: Browse built-in recipes + personal saved recipes
- **AI Ingredient Scan**: Take a photo of ingredients, Gemini extracts the list
- **AI Smart Search**: Natural language search across recipes using Gemini
- **URL Import**: Paste a recipe URL → Gemini extracts structured recipe data (fetches page HTML first)
- **Recipe Scaling**: Tap any ingredient to adjust amount; ½×/1×/2×/3× quick presets
- **Photo Support**: Add a photo to personal recipes (shows as hero background in detail view)
- **Edit Mode**: Tap the pencil icon on any personal recipe card to re-open the create form pre-filled
- **Shopping List**: Add all (scaled) ingredients from a recipe to a persistent checklist tab
- **Cook Mode**: Fullscreen step-by-step view with per-step countdown timer
- **Nutrition**: Per-serving nutrition estimates via USDA FDC API with caching
- **Favorites**: Heart any recipe for quick access on the Explore tab
- **Guest Mode**: Works fully without Supabase keys using local AsyncStorage

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

## Important Notes

- Do NOT edit package.json directly; use the package management tools
- Do NOT run `npx expo start` in the shell; use the workflow restart tool
- `useNativeDriver: true` warnings on web are expected and harmless
- Supabase config warnings are expected when keys are not configured
