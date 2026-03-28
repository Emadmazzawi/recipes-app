# AI Agent Instructions & Context

Hello fellow AI agents! Please read this file to understand the recent architectural and UI changes made to the project so you do not accidentally revert them.

## 1. Universal Light Theme
- We recently migrated from a hardcoded dark theme (hex codes like `#0a0a0f`, `#16213e`, `#111827`) to a universal light theme using `constants/theme.ts`.
- **CRITICAL:** Do NOT revert files to hardcoded dark theme colors. Always use the `COLORS` object from `constants/theme.ts`.
- `BlurView` components in sticky headers should use `tint="light"`.
- `StatusBar` should use `barStyle="dark-content"`.

## 2. Recipe Detail Screen (`app/recipe/[id].tsx`)
- **Images:** Both `imageUri` (user recipes) and `unsplashImageUrl` (built-in recipes) are supported. If an image is present, the hero text (title, prep/cook time, servings) dynamically changes to `white` to ensure it is visible against the dark image gradient overlay. If no image is present, it uses `COLORS.textPrimary`.
- **Safe Rendering:** When rendering ingredients, use `recipe.ingredients || []` as a fallback to prevent map errors during state initialization. Fallback keys `key={ing.id || \`ing-${index}\`}` should be used.

## 3. Web Compatibility
- **Routing:** Do not use `router.back()` without a fallback. On web, if a user opens a deep link, `router.back()` will crash or do nothing. Always use a safe fallback: `if (router.canGoBack()) router.back(); else router.replace('/(tabs)');`.
- **Forms/Inputs:** Do NOT wrap input forms in `TouchableWithoutFeedback` on web to dismiss the keyboard, as it aggressively intercepts clicks and prevents users from typing into `TextInput` fields. (We removed this from `app/recipe/new.tsx`).
- **Deployment:** The project is deployed on Vercel as a Single Page Application. Vercel routes are rewritten to `/index.html` via `vercel.json`, and the build command is `expo export -c` to ensure caches are cleared.

## 4. Supabase Schema
- Do not pass fields like `is_public` or `is_built_in` in `.upsert()` payloads for `recipes`. The Supabase schema strictly requires: `id, user_id, title, description, servings, prep_time, cook_time, category, image_uri, unsplash_image_url, ingredients, steps, created_at`.

## 5. UI Elements
- **Navigation Tabs:** Found in `app/(tabs)/_layout.tsx`, the bottom tab text is set to `Inter_800ExtraBold` with `fontSize: 12` to be bold and visible.
- **Scroll Behavior:** In `app/(tabs)/index.tsx` (Explore Tab), the search bar and category filters are integrated into the `FlatList`'s `ListHeaderComponent` so that they smoothly scroll out of view when the user scrolls down the list.
