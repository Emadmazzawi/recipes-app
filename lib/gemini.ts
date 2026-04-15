import { Ingredient } from '../types';
import { supabase } from './supabase';

/**
 * Common helper to call our Supabase 'gemini' Edge Function
 */
async function callGeminiFunction(action: string, payload: any) {
  try {
    const { data, error } = await supabase.functions.invoke('gemini', {
      body: { action, payload }
    });

    if (error) {
      console.error(`Edge function error [${action}]:`, error);
      throw error;
    }

    if (!data || data.error) {
      throw new Error(data?.error || 'No response from AI service');
    }

    // The edge function returns a JSON with a 'text' field (which is the JSON string from Gemini)
    const text = data.text;
    if (!text) throw new Error('No content received from AI.');

    // Try to parse the text as JSON, usually Gemini returns it inside the 'text' field
    // Sometimes there might be markdown backticks, though we use response_mime_type: "application/json"
    try {
      // Clean up markdown backticks if they exist (though they shouldn't with application/json)
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedText);
    } catch (parseErr) {
      console.error('Failed to parse AI response as JSON:', text);
      throw new Error('AI returned an invalid response format.');
    }
  } catch (err: any) {
    console.error(`Gemini call failed [${action}]:`, err);
    throw err;
  }
}

export async function scanIngredientsFromImage(base64Image: string): Promise<Partial<Ingredient>[]> {
  return await callGeminiFunction('scan_ingredients', { base64Image });
}

export async function smartSearchRecipes(query: string, recipes: any[]): Promise<string[]> {
  try {
    return await callGeminiFunction('smart_search', { query, recipes });
  } catch (error) {
    console.error('Smart search failed:', error);
    return [];
  }
}

export async function importRecipeFromUrl(input: string): Promise<any> {
  const trimmedInput = input.trim();
  const isUrl = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(trimmedInput) && !trimmedInput.includes(' ');
  
  if (isUrl) {
    let url = trimmedInput;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // We let the Edge Function handle the fetching to bypass CORS
    return await callGeminiFunction('import_recipe', { recipeUrl: url });
  } else {
    // If it's not a URL, it's raw text
    return await callGeminiFunction('import_recipe', { pageContent: trimmedInput });
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

