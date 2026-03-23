export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  cup: 240,
  tbsp: 15,
  tsp: 5,
  oz: 28.35,
  lb: 453.59,
  piece: 150,
  pinch: 0.5,
  clove: 5,
  slice: 30,
};

const nutritionCache = new Map<string, NutritionData | null>();

export async function fetchNutritionForIngredient(
  ingredientName: string,
  amount: number = 0,
  unit: string = 'g'
): Promise<NutritionData | null> {
  const cacheKey = `${ingredientName.toLowerCase()}|${amount}|${unit}`;
  if (nutritionCache.has(cacheKey)) {
    return nutritionCache.get(cacheKey) ?? null;
  }

  const API_KEY = 'DEMO_KEY';
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(ingredientName)}&api_key=${API_KEY}&pageSize=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      nutritionCache.set(cacheKey, null);
      return null;
    }

    const data = await response.json();
    if (!data.foods || data.foods.length === 0) {
      nutritionCache.set(cacheKey, null);
      return null;
    }

    const food = data.foods[0];
    const nutrients = food.foodNutrients || [];

    const unitWeight = UNIT_TO_GRAMS[unit.toLowerCase()] || 1;
    const totalWeightGrams = amount * unitWeight;
    const scaleFactor = totalWeightGrams / 100;

    const findNutrient = (ids: number[], names: string[]) => {
      const nutrient = nutrients.find((n: any) =>
        ids.includes(n.nutrientId) ||
        names.some(name => n.nutrientName.toLowerCase().includes(name.toLowerCase()))
      );
      return nutrient ? nutrient.value * scaleFactor : 0;
    };

    const result: NutritionData = {
      calories: findNutrient([1008], ['Energy']),
      protein: findNutrient([1003], ['Protein']),
      carbs: findNutrient([1005], ['Carbohydrate']),
      fat: findNutrient([1004], ['Total lipid', 'Fat']),
    };

    nutritionCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`Error fetching nutrition for ${ingredientName}:`, error);
    nutritionCache.set(cacheKey, null);
    return null;
  }
}
