# Fix Hebrew & Arabic RTL and Translations

## What & Why
The app has Hebrew and Arabic language options, but they are incomplete in three ways: (1) many UI screens and components still show hardcoded English text instead of translated strings, (2) the layout does not flip to right-to-left in most components when Hebrew or Arabic is selected, and (3) the 23 built-in recipes are English-only with no translated titles, descriptions, ingredients, or steps.

## Done looks like
- Every visible text string in the app (buttons, labels, placeholders, error messages, form fields, tab names, cooking mode steps, auth screen, scaling modal, recipe categories) is fully translated in Hebrew and Arabic
- When Hebrew or Arabic is selected, the entire UI flips to right-to-left: row layouts reverse, icons move to the correct side, text aligns right, and padding/margins swap sides across all screens and components (Explore, My Recipes, Shopping, Recipe Detail, Cook Mode, Create Recipe, Auth, Settings, ScaleRecipeModal, IngredientRow, RecipeCard)
- All 23 built-in recipes display their title, description, ingredient names, and cooking steps in Hebrew and Arabic when those languages are selected
- Switching languages updates the recipe content and layout direction immediately without a restart

## Out of scope
- User-created recipes (those are entered manually and stored in Supabase; only built-in recipes are translated)
- Adding new languages beyond English, Hebrew, and Arabic
- AI search behavior changes

## Tasks
1. **Expand i18n.ts with all missing translation keys** — Add Hebrew and Arabic translations for every hardcoded string found in: recipe creation form, cooking mode (step/of/prev/next/done/timer), auth screen (email/password/login/signup/guest), scaling modal (scale recipe/calculate), and recipe category names. English keys must be added first, then Hebrew and Arabic equivalents.

2. **Wire translation keys into all screens and components** — Replace every hardcoded English string in `app/recipe/new.tsx`, `app/recipe/cook.tsx`, `app/auth/index.tsx`, `app/recipe/[id].tsx`, `components/ScaleRecipeModal.tsx`, `components/RecipeCard.tsx`, and `components/IngredientRow.tsx` with the appropriate `t.*` key from the language context.

3. **Apply consistent RTL layout flipping** — In all screens and components that use `isRTL`, ensure horizontal layouts reverse (`flexDirection: 'row-reverse'`), text aligns right, `marginLeft`/`marginRight` swap, icon positions flip, and `writingDirection: 'rtl'` is set on all text elements when in RTL mode. This covers all tab screens, recipe detail, cook mode, create recipe, auth, and all shared components.

4. **Add translated built-in recipes** — In `constants/recipes.ts`, add `title_he`, `description_he`, `ingredients_he`, `instructions_he`, `title_ar`, `description_ar`, `ingredients_ar`, and `instructions_ar` fields for all 23 recipes. Update any recipe display logic to pick the correct language fields based on the active language from `LanguageContext`.

## Relevant files
- `lib/i18n.ts`
- `contexts/LanguageContext.tsx`
- `constants/recipes.ts`
- `app/(tabs)/index.tsx`
- `app/(tabs)/my-recipes.tsx`
- `app/(tabs)/shopping.tsx`
- `app/(tabs)/_layout.tsx`
- `app/recipe/new.tsx`
- `app/recipe/[id].tsx`
- `app/recipe/cook.tsx`
- `app/auth/index.tsx`
- `components/RecipeCard.tsx`
- `components/IngredientRow.tsx`
- `components/ScaleRecipeModal.tsx`
