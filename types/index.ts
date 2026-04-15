export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  category: string;
  ingredients: Ingredient[];
  steps: string[];
  isBuiltIn: boolean;
  createdAt: string;
  imageUri?: string;
  title_he?: string;
  description_he?: string;
  ingredients_he?: Ingredient[];
  instructions_he?: string[];
  title_ar?: string;
  description_ar?: string;
  ingredients_ar?: Ingredient[];
  instructions_ar?: string[];
  unsplashImageUrl?: string;
  is_public?: boolean;
  userId?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  checked: boolean;
  recipeTitle?: string;
}

export type Unit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'cup'
  | 'tbsp'
  | 'tsp'
  | 'oz'
  | 'lb'
  | 'piece'
  | 'pinch'
  | 'clove'
  | 'slice';
