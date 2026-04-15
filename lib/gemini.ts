import { Ingredient } from '../types';
import { supabase } from './supabase';
import { Platform } from 'react-native';

const COPILOT_API_URL = process.env.EXPO_PUBLIC_AI_API_URL || (Platform.OS === 'android' 
  ? 'http://10.0.2.2:4141/v1/chat/completions' 
  : 'http://localhost:4141/v1/chat/completions');
const MODEL = process.env.EXPO_PUBLIC_AI_MODEL || 'gpt-4o-2024-05-13';

async function callCopilotAPI(messages: any[]) {
  try {
    const response = await fetch(COPILOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { 
            role: 'system', 
            content: 'You are a precise data extraction API. You MUST return exclusively valid JSON. Do not include any markdown wrappers (like ```json), explanations, conversational text, or prefixes. If the user asks for an array, return only the array. If the user asks for an object, return only the object.' 
          },
          ...messages
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Robust cleaning for model responses that might include markdown
    if (content.includes('```')) {
      const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) content = match[1];
    }
    
    return content.trim();
  } catch (error) {
    console.error('Failed to call AI API:', error);
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
    return JSON.parse(text);
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
    return JSON.parse(text);
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

export async function importRecipeFromUrl(input: string): Promise<any> {
  const trimmedInput = input.trim();
  const isUrl = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(trimmedInput) && !trimmedInput.includes(' ');
  
  let pageContent = '';
  let url = trimmedInput;

  if (isUrl) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      const pageResponse = await fetchWithTimeout(url, {
        headers: { Accept: 'text/html,application/xhtml+xml' },
      }, 5000);
      if (pageResponse.ok) {
        pageContent = await pageResponse.text();
      }
    } catch (err) {
      console.log('Direct fetch failed, trying proxy...', err);
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const proxyResponse = await fetchWithTimeout(proxyUrl, {}, 8000);
        if (proxyResponse.ok) {
          const proxyData = await proxyResponse.json();
          pageContent = proxyData.contents || '';
        }
      } catch (proxyErr) {
        console.log('Proxy fetch failed as well', proxyErr);
      }
    }
  } else {
    // Input is likely raw text pasted by the user
    pageContent = trimmedInput;
  }

  if (pageContent && isUrl) {
    // Strip HTML only if it came from a URL
    pageContent = pageContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000); // Increased limit as Gemma handles larger contexts well
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
    
    const promptText = isUrl 
      ? (pageContent 
          ? `Extract a complete recipe from the following webpage text. Return ONLY a JSON object matching this schema: ${recipeSchema}\n\nWebpage content:\n${pageContent}`
          : `Extract the complete recipe from this URL: ${url}. Return ONLY a JSON object matching this schema: ${recipeSchema}. If a field is missing, provide a sensible default. Output only valid JSON.`)
      : `I have pasted the text of a recipe below. Please extract the details and return ONLY a JSON object matching this schema: ${recipeSchema}\n\nRecipe Text:\n${pageContent}`;
    
    const text = await callCopilotAPI([
      { role: 'user', content: promptText }
    ]);

    if (!text) throw new Error('No content received from AI.');
    return JSON.parse(text);
  } catch (error) {
    console.error('Import error:', error);
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
    return JSON.parse(text);
  } catch (error) {
    console.error('Pantry generation error:', error);
    throw error;
  }
}
