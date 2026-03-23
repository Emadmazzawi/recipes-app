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
