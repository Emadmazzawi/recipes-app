import { Ingredient } from '../types';
import { supabase } from './supabase';
import { Platform } from 'react-native';

const COPILOT_API_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:4141/v1/chat/completions' 
  : 'http://localhost:4141/v1/chat/completions';
const MODEL = 'gpt-4o-2024-05-13'; // Use the exact model ID from the copilot-api list

async function callCopilotAPI(messages: any[]) {
  try {
    const response = await fetch(COPILOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Copilot API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Failed to call Copilot API:', error);
    throw error;
  }
}

export async function scanIngredientsFromImage(base64Image: string): Promise<Partial<Ingredient>[]> {
  try {
    const promptText = "Extract ingredients from this image of a recipe list. Return ONLY a JSON array of objects with 'name' (string), 'amount' (number), and 'unit' (string) keys. If amount is not specified, use 1. If unit is not specified, use 'piece'. Standardize units to: g, kg, ml, l, cup, tbsp, tsp, oz, lb, piece, pinch, clove, slice. Image might be handwritten or printed. Output only the JSON array.";
    
    const text = await callCopilotAPI([
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }
    ]);

    if (!text) throw new Error('No content received from AI.');

    // Robust JSON array extraction
    let jsonStr = '';
    const blockMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (blockMatch) {
      jsonStr = blockMatch[1];
    } else {
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start === -1 || end === -1 || start >= end) {
        throw new Error('Could not find JSON array bounds.');
      }
      jsonStr = text.substring(start, end + 1);
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error scanning ingredients:', error);
    throw error;
  }
}

export async function smartSearchRecipes(query: string, recipes: any[]): Promise<Record<string, string>> {
  try {
    const recipeList = recipes.map((r: any) => ({
      id: r.id,
      title: r.title,
      ingredients: r.ingredients.map((i: any) => i.name).join(', '),
    }));
    
    const promptText = `Analyze the search query: "${query}" against this list of recipes. Identify which ones match (directly or conceptually). Return ONLY a JSON object where keys are recipe IDs and values are a short one-sentence explanation of why it matches. Recipes: ${JSON.stringify(recipeList)}`;
    
    const text = await callCopilotAPI([
      { role: 'user', content: promptText }
    ]);

    if (!text) return {};

    // Robust JSON object extraction
    let jsonStr = '';
    const blockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (blockMatch) {
      jsonStr = blockMatch[1];
    } else {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1 || start >= end) return {};
      jsonStr = text.substring(start, end + 1);
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Smart search error:', error);
    return {};
  }
}

// Helper function to add timeout to fetch
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export async function importRecipeFromUrl(recipeUrl: string): Promise<any> {
  let url = recipeUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  let pageContent = '';
  try {
    const pageResponse = await fetchWithTimeout(url, {
      headers: { Accept: 'text/html,application/xhtml+xml' },
    }, 5000);
    if (!pageResponse.ok) throw new Error('Direct fetch failed');
    const html = await pageResponse.text();
    pageContent = html;
  } catch (err) {
    console.log('Direct fetch failed, trying proxy...', err);
    try {
      // Fallback to a CORS proxy for web usage
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const proxyResponse = await fetchWithTimeout(proxyUrl, {}, 8000);
      if (proxyResponse.ok) {
        const proxyData = await proxyResponse.json();
        pageContent = proxyData.contents || '';
      }
    } catch (proxyErr) {
      console.log('Proxy fetch failed as well', proxyErr);
      pageContent = '';
    }
  }

  if (pageContent) {
    pageContent = pageContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000);
  }

  try {
    const recipeSchema = `{
      "title": "string",
      "description": "string",
      "servings": number,
      "prepTime": number,
      "cookTime": number,
      "category": "Breakfast|Main|Appetizer|Dessert|Baking|Soup|Salad|Drinks|Other",
      "ingredients": [{"name": "string", "amount": number, "unit": "string"}],
      "steps": ["string"]
    }`;
    
    const promptText = pageContent
      ? `Extract a complete recipe from the following webpage text. Return ONLY a JSON object matching this schema: ${recipeSchema}\n\nWebpage content:\n${pageContent}`
      : `Extract the complete recipe from this URL: ${url}. Return ONLY a JSON object matching this schema: ${recipeSchema}. If a field is missing, provide a sensible default. Output only valid JSON.`;
    
    const text = await callCopilotAPI([
      { role: 'user', content: promptText }
    ]);

    if (!text) throw new Error('No content received from AI.');

    // Robust JSON object extraction
    let jsonStr = '';
    const blockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (blockMatch) {
      jsonStr = blockMatch[1];
    } else {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1 || start >= end) {
        throw new Error('Could not find JSON object bounds.');
      }
      jsonStr = text.substring(start, end + 1);
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('URL import error:', error);
    throw error;
  }
}

export async function fetchUnsplashImage(query: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('unsplash', {
      body: { query }
    });

    if (error) {
      console.error('Supabase function error:', error.message);
      return null;
    }
    
    if (data.error) {
      console.error('Unsplash API error:', data.error);
      return null;
    }

    return data.imageUrl || null;
  } catch (error) {
    console.error('Error fetching image from Unsplash:', error);
    return null;
  }
}

export async function generateRecipeFromIngredients(ingredients: string[]): Promise<any> {
  try {
    const recipeSchema = `{
      "title": "string",
      "description": "string",
      "servings": number,
      "prepTime": number,
      "cookTime": number,
      "category": "Main|Appetizer|Dessert|Baking|Soup|Salad|Breakfast|Drinks|Other",
      "ingredients": [{"name": "string", "amount": number, "unit": "string"}],
      "steps": ["string"]
    }`;
    
    const promptText = `You are a creative executive chef. I have the following ingredients in my fridge/pantry: ${ingredients.join(', ')}. 
Create a delicious recipe that uses these ingredients. You may also include very basic household staples (like salt, pepper, cooking oil, water, butter, basic spices).
Return ONLY a JSON object matching this schema: ${recipeSchema}. Output only valid JSON, no markdown formatting outside of the JSON block.`;

    const text = await callCopilotAPI([
      { role: 'user', content: promptText }
    ]);

    if (!text) throw new Error('No content received from AI.');

    // Robust JSON object extraction
    let jsonStr = '';
    const blockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (blockMatch) {
      jsonStr = blockMatch[1];
    } else {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1 || start >= end) {
        throw new Error('Could not find JSON object bounds.');
      }
      jsonStr = text.substring(start, end + 1);
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Pantry generation error:', error);
    throw error;
  }
}
