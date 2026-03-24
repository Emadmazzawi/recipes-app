# Recipe Scaler — AI-Powered Recipe App

## Project Overview
Expo/React Native mobile app for managing, scaling, and discovering recipes. Runs in web preview mode on port 5000 via Expo web bundler. Published to Replit hosting.

## Key Features
- AI smart search via Google Gemini
- OCR ingredient scanning
- URL recipe import (paste any recipe URL to auto-fill)
- Recipe scaling (½×, 1×, 2×, 3×)
- Nutrition info per ingredient
- Cook mode (step-by-step with timers)
- Shopping list with check-off
- Cloud sync via Supabase (auth + storage)
- Offline local storage fallback (AsyncStorage)
- Language support: English, Hebrew (עברית), Arabic (العربية) with RTL text

## Tech Stack
- Expo (web mode, port 5000)
- React Native + Expo Router (file-based routing)
- TypeScript
- Supabase (auth + cloud sync)
- Google Gemini AI
- LinearGradient, BlurView, Ionicons
- Inter fonts (@expo-google-fonts/inter)

## Architecture

### Key Files
- `app/_layout.tsx` — Root layout with auth session management, font loading, LanguageProvider
- `app/(tabs)/_layout.tsx` — Floating pill-shaped tab bar with blur
- `app/(tabs)/index.tsx` — Explore screen: built-in recipes, AI smart search, gear settings, language selection
- `app/(tabs)/my-recipes.tsx` — Library screen: personal recipes with URL import card
- `app/(tabs)/shopping.tsx` — Shopping list with check-off and progress bar
- `app/recipe/[id].tsx` — Recipe detail with scaling, nutrition, cook mode
- `app/recipe/new.tsx` — Create/edit recipe with AI assist + URL import
- `app/recipe/cook.tsx` — Cook mode with step-by-step timer
- `app/auth/index.tsx` — Auth screen (sign in / sign up)

### Components
- `components/RecipeCard.tsx` — Recipe card with warm gradient, favorite/edit/delete actions
- `components/IngredientRow.tsx` — Inline-editable ingredient row
- `components/Skeleton.tsx` — Loading skeletons

### Constants & Config
- `constants/theme.ts` — Warm dark color palette (COLORS object)
- `constants/recipes.ts` — Built-in recipe data + categories
- `lib/i18n.ts` — Translations for EN/HE/AR
- `contexts/LanguageContext.tsx` — Language state + RTL detection, useLanguage() hook
- `lib/gemini.ts` — Gemini AI integration (smart search, OCR, URL import)
- `lib/supabase.ts` — Supabase client
- `lib/storage.ts` — AsyncStorage + Supabase sync (recipes, favorites, shopping list)
- `lib/scaler.ts` — Ingredient amount scaling utilities
- `lib/nutrition.ts` — Nutrition fetching per ingredient

## Color Palette (Warm Dark Theme)
All colors in `constants/theme.ts`. Key values:
- `COLORS.bg` = `#0f0a06` (very dark warm brown, replaces cold navy)
- `COLORS.surface` = `#1e1409` (warm dark)
- `COLORS.card` = `#231711` (card background)
- `COLORS.primary` = `#e8722a` (warm terracotta orange)
- `COLORS.primaryLight` = `#f5a623` (amber highlight)
- `COLORS.textPrimary` = `#fdf4e7` (warm cream)
- `COLORS.textSecondary` = `#c4a07a` (warm tan)
- `COLORS.textMuted` = `#7a5c40` (warm brown)

## Navigation
- `/` → Explore (built-in recipes)
- `/my-recipes` → Library (personal recipes)
- `/shopping` → Shopping list
- `/recipe/[id]?type=builtin|personal` → Recipe detail
- `/recipe/new` → New recipe (optionally with `editId` or `importUrl` params)
- `/recipe/cook?id=...&type=...` → Cook mode
- `/auth` → Sign in / Sign up

## Environment Variables
- `EXPO_PUBLIC_GEMINI_API_KEY` — Google Gemini API key
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key

## Important Notes
- Never edit `package.json` directly; use npm install with `--legacy-peer-deps`
- Never run `npx expo start` in the shell (workflow manages it)
- Shopping list stored under AsyncStorage key `shopping_list`
- Language preference stored under AsyncStorage key `app_language`
- URL import: navigate to `/recipe/new` with `params: { importUrl: url }`
- Edit mode: navigate to `/recipe/new` with `params: { editId: recipe.id }`
