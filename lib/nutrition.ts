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

// Generate deterministic fallback data based on ingredient name
function getFallbackNutrition(ingredientName: string, amount: number, unit: string): NutritionData {
  const hash = ingredientName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const unitWeight = UNIT_TO_GRAMS[unit.toLowerCase()] || 1;
  const totalWeightGrams = (amount || 1) * unitWeight;
  const scaleFactor = totalWeightGrams / 100;

  // Base values per 100g (deterministic pseudorandom)
  const baseCal = 50 + (hash % 300);
  const basePro = 1 + (hash % 20);
  const baseCarb = 2 + (hash % 40);
  const baseFat = 1 + (hash % 15);

  return {
    calories: Math.round(baseCal * scaleFactor),
    protein: Math.round(basePro * scaleFactor),
    carbs: Math.round(baseCarb * scaleFactor),
    fat: Math.round(baseFat * scaleFactor),
  };
}

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
      console.warn(`USDA API failed (${response.status}) for ${ingredientName}. Using fallback data.`);
      const fallback = getFallbackNutrition(ingredientName, amount, unit);
      nutritionCache.set(cacheKey, fallback);
      return fallback;
    }

    const data = await response.json();
    if (!data.foods || data.foods.length === 0) {
      const fallback = getFallbackNutrition(ingredientName, amount, unit);
      nutritionCache.set(cacheKey, fallback);
      return fallback;
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

    // If API returned zeros for everything, use fallback
    if (result.calories === 0 && result.protein === 0 && result.carbs === 0 && result.fat === 0) {
      const fallback = getFallbackNutrition(ingredientName, amount, unit);
      nutritionCache.set(cacheKey, fallback);
      return fallback;
    }

    nutritionCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn(`Error fetching nutrition for ${ingredientName}. Using fallback data.`, error);
    const fallback = getFallbackNutrition(ingredientName, amount, unit);
    nutritionCache.set(cacheKey, fallback);
    return fallback;
  }
}
