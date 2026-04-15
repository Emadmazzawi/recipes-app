import { Ingredient } from '../types';
import { supabase } from './supabase';

/**
 * Common helper to call our Supabase 'gemini' Edge Function
 */
async function callGeminiFunction(action: string, payload: any) {
  try {
    const supabaseUrl = (supabase as any).supabaseUrl;
    const supabaseKey = (supabase as any).supabaseKey;
    
    console.log(`[lib/gemini] Diagnostics - URL: ${supabaseUrl?.substring(0, 20)}... Key: ${supabaseKey?.substring(0, 10)}...`);
    
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      throw new Error(`Config Error: Supabase URL is missing from app. Env keys: ${Object.keys(process.env).filter(k => k.startsWith('EXPO_PUBLIC')).join(', ')}`);
    }

    console.log(`[lib/gemini] Calling Edge Function: ${action}`, {
      ...payload,
      base64Image: payload.base64Image ? '(base64 string...)' : undefined
    });

    const { data, error } = await supabase.functions.invoke('gemini', {
      body: { action, payload }
    });

    if (error) {
      console.error(`[lib/gemini] Supabase Invoke Error [${action}]:`, error);
      
      // If we got a response body, it might be an error from our function
      let details = error.message;
      try {
        if ((error as any).context?.text) {
          const bodyJSON = JSON.parse((error as any).context.text);
          details = bodyJSON.error || details;
        }
      } catch (e) {}

      throw new Error(`Server Error (${error.status || '?' }): ${details}`);
    }

    if (!data) {
      console.error(`[lib/gemini] No data returned from function [${action}]`);
      throw new Error('No response from AI service');
    }

    if (data.error) {
      console.error(`[lib/gemini] Function returned error [${action}]:`, data.error);
      throw new Error(data.error);
    }

    const text = data.text;
    if (!text) {
      console.error(`[lib/gemini] Function returned no text field [${action}]`, data);
      throw new Error('No content received from AI.');
    }

    console.log(`[lib/gemini] Received text response length: ${text.length}`);

    try {
      // Clean up markdown backticks
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedText);
      console.log(`[lib/gemini] Successfully parsed JSON for [${action}]`);
      return parsed;
    } catch (parseErr) {
      console.error(`[lib/gemini] JSON Parse Error [${action}]:`, text);
      throw new Error('AI returned an invalid response format.');
    }
  } catch (err: any) {
    console.error(`[lib/gemini] Gemini call failed [${action}]:`, err);
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

