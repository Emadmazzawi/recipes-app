import { Ingredient } from '../types';

const API_KEY = "AIzaSyAWWvKxGuKUbIcUfkyHw341jAdgj0P-9cc";

export async function scanIngredientsFromImage(base64Image: string): Promise<Partial<Ingredient>[]> {
  const GEMINI_API_KEY = API_KEY;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = "Extract ingredients from this image of a recipe list. Return ONLY a JSON array of objects with 'name' (string), 'amount' (number), and 'unit' (string) keys. If amount is not specified, use 1. If unit is not specified, use 'piece'. Standardize units to: g, kg, ml, l, cup, tbsp, tsp, oz, lb, piece, pinch, clove, slice. Image might be handwritten or printed. Output only the JSON array.";

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
          ],
        }],
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'API request failed');

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No content received from Gemini.');

    const jsonMatch = text.match(/\[.*\]/s);
    if (!jsonMatch) throw new Error('Could not parse ingredients JSON.');

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error scanning ingredients:', error);
    throw error;
  }
}

export async function smartSearchRecipes(query: string, recipes: any[]): Promise<Record<string, string>> {
  const GEMINI_API_KEY = API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const recipeList = recipes.map(r => ({
    id: r.id,
    title: r.title,
    ingredients: r.ingredients.map((i: any) => i.name).join(', '),
  }));

  const prompt = `Analyze the search query: "${query}" against this list of recipes. Identify which ones match (directly or conceptually). Return ONLY a JSON object where keys are recipe IDs and values are a short one-sentence explanation of why it matches. Recipes: ${JSON.stringify(recipeList)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'API request failed');

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return {};

    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) return {};

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Smart search error:', error);
    return {};
  }
}

export async function importRecipeFromUrl(recipeUrl: string): Promise<any> {
  const GEMINI_API_KEY = API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `Fetch and extract the complete recipe details from this URL: ${recipeUrl}. 
  Return ONLY a JSON object with these exact fields:
  {
    "title": "string",
    "description": "string",
    "servings": number,
    "prepTime": number,
    "cookTime": number,
    "category": "Breakfast|Main|Appetizer|Dessert|Baking|Soup|Salad|Drinks|Other",
    "ingredients": [{"name": "string", "amount": number, "unit": "string"}],
    "steps": ["string"]
  }
  If a field is missing, provide a sensible default. Output only valid JSON.`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'API request failed');

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No content received from Gemini.');

    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error('Could not parse recipe JSON from AI response.');

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('URL import error:', error);
    throw error;
  }
}
