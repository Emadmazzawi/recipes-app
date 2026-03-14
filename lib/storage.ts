import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types';

const PERSONAL_RECIPES_KEY = 'personal_recipes';

/**
 * Retrieves all personal recipes from local storage.
 * Includes basic validation to ensure data integrity.
 */
export async function getPersonalRecipes(): Promise<Recipe[]> {
  try {
    const data = await AsyncStorage.getItem(PERSONAL_RECIPES_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      console.error('Invalid storage format: personal_recipes is not an array');
      return [];
    }
    
    // Basic structural validation
    return parsed.filter(r => r && typeof r === 'object' && r.id && r.title);
  } catch (error) {
    console.error('Error reading personal recipes:', error);
    return [];
  }
}

/**
 * Saves or updates a personal recipe in local storage.
 */
export async function savePersonalRecipe(recipe: Recipe): Promise<void> {
  try {
    if (!recipe.id || !recipe.title) {
      throw new Error('Cannot save invalid recipe: missing id or title');
    }

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
  } catch (error) {
    console.error('Error saving personal recipe:', error);
    throw error; // Re-throw to handle in UI if needed
  }
}

/**
 * Deletes a personal recipe from local storage.
 */
export async function deletePersonalRecipe(id: string): Promise<void> {
  try {
    const recipes = await getPersonalRecipes();
    const updated = recipes.filter(r => r.id !== id);
    await AsyncStorage.setItem(PERSONAL_RECIPES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error deleting personal recipe:', error);
    throw error;
  }
}

/**
 * Exports personal recipes as a JSON string.
 */
export async function exportRecipes(): Promise<string> {
  const recipes = await getPersonalRecipes();
  return JSON.stringify(recipes, null, 2);
}

/**
 * Imports recipes from a JSON string.
 */
export async function importRecipes(jsonString: string): Promise<void> {
  try {
    const imported = JSON.parse(jsonString);
    if (!Array.isArray(imported)) throw new Error('Import data must be an array');
    
    const existing = await getPersonalRecipes();
    const existingIds = new Set(existing.map(r => r.id));
    
    const newRecipes = imported.filter(r => r.id && r.title && !existingIds.has(r.id));
    await AsyncStorage.setItem(PERSONAL_RECIPES_KEY, JSON.stringify([...existing, ...newRecipes]));
  } catch (error) {
    console.error('Error importing recipes:', error);
    throw error;
  }
}
