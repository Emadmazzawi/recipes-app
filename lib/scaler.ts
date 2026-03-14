import { Ingredient } from '../types';

/**
 * Given a reference ingredient amount and what the user actually has,
 * returns the scale factor to apply to all other ingredients.
 */
export function calculateScaleFactor(
  originalAmount: number,
  availableAmount: number
): number {
  if (originalAmount <= 0) return 1;
  return availableAmount / originalAmount;
}

/**
 * Scales all ingredients by a given factor, rounding to sensible precision.
 */
export function scaleIngredients(
  ingredients: Ingredient[],
  scaleFactor: number
): Ingredient[] {
  return ingredients.map(ing => ({
    ...ing,
    amount: roundAmount(ing.amount * scaleFactor),
  }));
}

/**
 * Rounds to a sensible number of decimal places based on value size.
 */
export function roundAmount(value: number): number {
  if (value === 0) return 0;
  if (value >= 100) return Math.round(value);
  if (value >= 10) return Math.round(value * 10) / 10;
  if (value >= 1) return Math.round(value * 100) / 100;
  return Math.round(value * 1000) / 1000;
}

/**
 * Formats an amount for display, removing unnecessary trailing zeros.
 */
export function formatAmount(amount: number): string {
  const rounded = roundAmount(amount);
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 3,
  }).format(rounded);
}
