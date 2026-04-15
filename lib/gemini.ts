import { Ingredient } from '../types';
import { supabase } from './supabase';
import { Platform } from 'react-native';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

async function callCopilotAPI(content: any[]) {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing Gemini API Key. Please add EXPO_PUBLIC_GEMINI_API_KEY to your environment.');
  }

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: content
        }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1,
        }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const textResponse = data.candidates[0].content.parts[0].text;
    
    return textResponse.trim();
  } catch (error) {
    console.error('Failed to call Gemini API:', error);
    throw error;
  }
}

export async function scanIngredientsFromImage(base64Image: string): Promise<Partial<Ingredient>[]> {
  try {
    const promptText = "Extract ingredients from this image of a recipe list. Return a JSON array of objects with 'name' (string), 'amount' (number), and 'unit' (string) keys. If amount is not specified, use 1. If unit is not specified, use 'piece'. Standardize units to: g, kg, ml, l, cup, tbsp, tsp, oz, lb, piece, pinch, clove, slice. Image might be handwritten or printed.";
    
    const text = await callCopilotAPI([
      { text: promptText },
      { inline_data: { mime_type: "image/jpeg", data: base64Image } }
    ]);

    if (!text) throw new Error('No content received from AI.');
    return JSON.parse(text);
  } catch (error) {
    console.error('Ingredients scan error:', error);
    throw error;
  }
}

export async function smartSearchRecipes(query: string, recipes: any[]): Promise<string[]> {
  try {
    const recipeList = recipes.map(r => ({ id: r.id, title: r.title, description: r.description }));
    const promptText = `Find recipes that match the user's query: "${query}". 
    Consider synonyms, cuisines, and ingredients. 
    Return ONLY a JSON array of matching recipe IDs. 
    Recipe List: ${JSON.stringify(recipeList)}`;

    const text = await callCopilotAPI([{ text: promptText }]);
    if (!text) return [];
    
    return JSON.parse(text);
  } catch (error) {
    console.error('Smart search error:', error);
    return [];
  }
}

// Helper to fetch content with timeout
const fetchWithTimeout = async (url: string, options: any, timeout = 7000) => {
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
    pageContent = trimmedInput;
  }

  if (pageContent && isUrl) {
    pageContent = pageContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 15000); // Gemini handles large context well
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
          ? `Extract a complete recipe from the following webpage text. Return a JSON object matching this schema: ${recipeSchema}\n\nWebpage content:\n${pageContent}`
          : `Extract the complete recipe from this URL: ${url}. Return a JSON object matching this schema: ${recipeSchema}. If a field is missing, provide a sensible default.`)
      : `Extract recipe details from this text and return a JSON object matching this schema: ${recipeSchema}\n\nRecipe Text:\n${pageContent}`;
    
    const text = await callCopilotAPI([{ text: promptText }]);

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
    if (error) throw error;
    return data.url;
  } catch (error) {
    console.error('Unsplash fetch error:', error);
    return null;
  }
}
