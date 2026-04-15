import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe, Ingredient, ShoppingItem } from '../types';
import { supabase } from './supabase';

const PERSONAL_RECIPES_KEY = 'personal_recipes';
const FAVORITES_KEY = 'favorite_recipes';
const SHOPPING_LIST_KEY = 'shopping_list';

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getPersonalRecipes(): Promise<Recipe[]> {
  try {
    const user = await getCurrentUser();

    if (user) {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Supabase error fetching recipes (offline?):', error);
      } else if (data) {
        const parsedRecipes = data.map((row: any) => {
          let parsedIngredients = [];
          let parsedSteps = [];
          try {
            parsedIngredients = typeof row.ingredients === 'string' ? JSON.parse(row.ingredients) : row.ingredients;
          } catch (e) {}
          try {
            parsedSteps = typeof row.steps === 'string' ? JSON.parse(row.steps) : row.steps;
          } catch (e) {}

          return {
            id: row.id,
            title: row.title,
            description: row.description,
            servings: row.servings,
            prepTime: row.prep_time,
            cookTime: row.cook_time,
            category: row.category,
            imageUri: row.image_uri,
            unsplashImageUrl: row.unsplash_image_url,
            ingredients: parsedIngredients,
            steps: parsedSteps,
            isBuiltIn: row.is_built_in,
            createdAt: row.created_at,
          } as Recipe;
        });
        
        // Offline Cache: Update local storage with fresh remote data
        await AsyncStorage.setItem(PERSONAL_RECIPES_KEY, JSON.stringify(parsedRecipes));
        return parsedRecipes;
      }
    }

    // Fallback: Read from Offline Cache
    const localData = await AsyncStorage.getItem(PERSONAL_RECIPES_KEY);
    if (!localData) return [];
    const parsed = JSON.parse(localData);
    return Array.isArray(parsed) ? parsed.filter(r => r && typeof r === 'object' && r.id && r.title) : [];
  } catch (error) {
    console.error('Error reading personal recipes:', error);
    // Ultimate fallback
    try {
      const localData = await AsyncStorage.getItem(PERSONAL_RECIPES_KEY);
      return localData ? JSON.parse(localData) : [];
    } catch {
      return [];
    }
  }
}

export async function savePersonalRecipe(recipe: Recipe): Promise<void> {
  try {
    if (!recipe.id || !recipe.title) {
      throw new Error('Cannot save invalid recipe: missing id or title');
    }

    const user = await getCurrentUser();

    const recipes = await getPersonalRecipes();
    const index = recipes.findIndex(r => r.id === recipe.id);
    let updatedRecipes;
    if (index >= 0) {
      updatedRecipes = [...recipes];
      updatedRecipes[index] = recipe;
    } else {
      updatedRecipes = [...recipes, recipe];
    }
    await AsyncStorage.setItem(PERSONAL_RECIPES_KEY, JSON.stringify(updatedRecipes));

    if (user) {
      const dbRecipe = {
        id: recipe.id,
        user_id: user.id,
        title: recipe.title,
        description: recipe.description,
        servings: recipe.servings,
        prep_time: recipe.prepTime,
        cook_time: recipe.cookTime,
        category: recipe.category,
        image_uri: recipe.imageUri,
        unsplash_image_url: recipe.unsplashImageUrl,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        is_built_in: recipe.isBuiltIn,
        created_at: recipe.createdAt,
      };

      const { error } = await supabase
        .from('recipes')
        .upsert(dbRecipe, { onConflict: 'id' });

      if (error) {
        console.error('Supabase error saving recipe:', error);
      }
    }
  } catch (error) {
    console.error('Error saving personal recipe:', error);
    throw error;
  }
}

export async function deletePersonalRecipe(id: string): Promise<void> {
  try {
    const user = await getCurrentUser();

    const recipes = await getPersonalRecipes();
    const updated = recipes.filter(r => r.id !== id);
    await AsyncStorage.setItem(PERSONAL_RECIPES_KEY, JSON.stringify(updated));

    if (user) {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Supabase error deleting recipe:', error);
      }
    }

    await removeFavorite(id);
  } catch (error) {
    console.error('Error deleting personal recipe:', error);
    throw error;
  }
}

export async function getFavorites(): Promise<string[]> {
  try {
    const user = await getCurrentUser();

    if (user) {
      const { data, error } = await supabase
        .from('favorites')
        .select('recipe_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Supabase error fetching favorites (offline?):', error);
      } else if (data) {
        const favs = data.map(f => f.recipe_id);
        // Offline Cache
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
        return favs;
      }
    }

    const localData = await AsyncStorage.getItem(FAVORITES_KEY);
    return localData ? JSON.parse(localData) : [];
  } catch (error) {
    console.error('Error reading favorites:', error);
    try {
      const localData = await AsyncStorage.getItem(FAVORITES_KEY);
      return localData ? JSON.parse(localData) : [];
    } catch {
      return [];
    }
  }
}

export async function addFavorite(id: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    const favorites = await getFavorites();

    if (!favorites.includes(id)) {
      const updated = [...favorites, id];
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));

      if (user) {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, recipe_id: id });

        if (error) {
          console.error('Supabase error adding favorite:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error adding favorite:', error);
  }
}

export async function removeFavorite(id: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    const favorites = await getFavorites();
    const updated = favorites.filter(favId => favId !== id);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));

    if (user) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('recipe_id', id);

      if (error) {
        console.error('Supabase error removing favorite:', error);
      }
    }
  } catch (error) {
    console.error('Error removing favorite:', error);
  }
}

export async function isFavorite(id: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.includes(id);
}

export async function exportRecipes(): Promise<string> {
  const recipes = await getPersonalRecipes();
  return JSON.stringify(recipes, null, 2);
}

export async function importRecipes(jsonString: string): Promise<void> {
  try {
    const imported = JSON.parse(jsonString);
    if (!Array.isArray(imported)) throw new Error('Import data must be an array');

    const existing = await getPersonalRecipes();
    const existingIds = new Set(existing.map(r => r.id));

    const newRecipes = imported.filter(r => r.id && r.title && !existingIds.has(r.id));

    for (const recipe of newRecipes) {
      await savePersonalRecipe(recipe);
    }
  } catch (error) {
    console.error('Error importing recipes:', error);
    throw error;
  }
}

export async function publishRecipe(id: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Must be signed in to publish recipes.");

    const { error } = await supabase
      .from('recipes')
      .update({ is_public: true })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Supabase error publishing recipe:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error publishing recipe:', error);
    throw error;
  }
}

export async function getPublicRecipes(): Promise<Recipe[]> {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching public recipes:', error);
      return [];
    }
    
    if (data) {
      return data.map((row: any) => {
        let parsedIngredients = [];
        let parsedSteps = [];
        try {
          parsedIngredients = typeof row.ingredients === 'string' ? JSON.parse(row.ingredients) : row.ingredients;
        } catch (e) {}
        try {
          parsedSteps = typeof row.steps === 'string' ? JSON.parse(row.steps) : row.steps;
        } catch (e) {}

        return {
          id: row.id,
          title: row.title,
          description: row.description,
          servings: row.servings,
          prepTime: row.prep_time,
          cookTime: row.cook_time,
          category: row.category,
          imageUri: row.image_uri,
          unsplashImageUrl: row.unsplash_image_url,
          ingredients: parsedIngredients,
          steps: parsedSteps,
          isBuiltIn: row.is_built_in,
          createdAt: row.created_at,
          is_public: row.is_public,
          userId: row.user_id,
        } as Recipe;
      });
    }
    return [];
  } catch (error) {
    console.error('Error fetching public recipes:', error);
    return [];
  }
}

// ─── Shopping List ────────────────────────────────────────────────────────────

export async function getShoppingList(): Promise<ShoppingItem[]> {
  try {
    const data = await AsyncStorage.getItem(SHOPPING_LIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function addIngredientsToShoppingList(
  ingredients: Ingredient[],
  recipeTitle: string
): Promise<void> {
  try {
    const existing = await getShoppingList();
    const existingKeys = new Set(
      existing.map(item => `${item.recipeTitle}|${item.name.toLowerCase()}`)
    );

    const newItems: ShoppingItem[] = ingredients
      .filter(ing => !existingKeys.has(`${recipeTitle}|${ing.name.toLowerCase()}`))
      .map(ing => ({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        checked: false,
        recipeTitle,
      }));

    await AsyncStorage.setItem(
      SHOPPING_LIST_KEY,
      JSON.stringify([...existing, ...newItems])
    );
  } catch (error) {
    console.error('Error adding to shopping list:', error);
    throw error;
  }
}

export async function toggleShoppingItem(id: string): Promise<void> {
  try {
    const list = await getShoppingList();
    const updated = list.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error toggling shopping item:', error);
  }
}

export async function removeShoppingItem(id: string): Promise<void> {
  try {
    const list = await getShoppingList();
    const updated = list.filter(item => item.id !== id);
    await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error removing shopping item:', error);
  }
}

export async function clearCheckedItems(): Promise<void> {
  try {
    const list = await getShoppingList();
    const updated = list.filter(item => !item.checked);
    await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error clearing checked items:', error);
  }
}

export async function clearShoppingList(): Promise<void> {
  try {
    await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify([]));
  } catch (error) {
    console.error('Error clearing shopping list:', error);
  }
}
