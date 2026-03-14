export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Estimation factors for standard units to grams (approximate).
 */
const UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  ml: 1, // Assume water-like density
  l: 1000,
  cup: 240, // standard US cup
  tbsp: 15,
  tsp: 5,
  oz: 28.35,
  lb: 453.59,
  piece: 150, // Average weight of a medium fruit/vegetable
  pinch: 0.5,
  clove: 5,
  slice: 30,
};

/**
 * Fetches nutrition data for a given ingredient and amount using the USDA FDC API.
 * Returns values scaled to the provided amount.
 * 
 * @param ingredientName The name of the ingredient.
 * @param amount The amount specified in the recipe.
 * @param unit The unit of measurement.
 * @returns NutritionData object or null if not found.
 */
export async function fetchNutritionForIngredient(
  ingredientName: string,
  amount: number = 0,
  unit: string = 'g'
): Promise<NutritionData | null> {
  const API_KEY = 'DEMO_KEY';
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(ingredientName)}&api_key=${API_KEY}&pageSize=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`USDA API error: ${response.statusText}`);
    }
    
    const data = await response.json();

    if (!data.foods || data.foods.length === 0) {
      return null;
    }

    const food = data.foods[0];
    const nutrients = food.foodNutrients || [];

    // FDC values are typically per 100g for most food types
    // We calculate a weight factor based on the amount and unit
    const unitWeight = UNIT_TO_GRAMS[unit.toLowerCase()] || 1;
    const totalWeightGrams = amount * unitWeight;
    const scaleFactor = totalWeightGrams / 100;

    const findNutrient = (ids: number[], names: string[]) => {
      const nutrient = nutrients.find((n: any) => 
        ids.includes(n.nutrientId) || names.some(name => n.nutrientName.toLowerCase().includes(name.toLowerCase()))
      );
      return nutrient ? (nutrient.value * scaleFactor) : 0;
    };

    return {
      calories: findNutrient([1008], ['Energy']),
      protein: findNutrient([1003], ['Protein']),
      carbs: findNutrient([1005], ['Carbohydrate']),
      fat: findNutrient([1004], ['Total lipid', 'Fat']),
    };
  } catch (error) {
    console.error(`Error fetching nutrition for ${ingredientName}:`, error);
    return null;
  }
}
