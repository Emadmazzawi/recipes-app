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
  prepTime: number; // minutes
  cookTime: number; // minutes
  category: string;
  ingredients: Ingredient[];
  steps: string[];
  isBuiltIn: boolean;
  createdAt: string;
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
