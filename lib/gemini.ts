import { Ingredient } from '../types';
import { supabase } from './supabase';

export async function scanIngredientsFromImage(base64Image: string): Promise<Partial<Ingredient>[]> {
  try {
    const { data, error } = await supabase.functions.invoke('gemini', {
      body: { action: 'scan_ingredients', payload: { base64Image } }
    });

    if (error) throw new Error(error.message || 'Supabase function failed');
    if (data?.error) throw new Error(data.error || 'API request failed');

    const text = data.text;
    if (!text) throw new Error('No content received from Gemini.');

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
    const { data, error } = await supabase.functions.invoke('gemini', {
      body: { action: 'smart_search', payload: { query, recipes } }
    });

    if (error) throw new Error(error.message || 'Supabase function failed');
    if (data?.error) throw new Error(data.error || 'API request failed');

    const text = data.text;
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
    // We add a manual timeout promise for the supabase invocation
    // because it might hang if the edge function or Gemini is unresponsive
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI Request timed out')), 25000);
    });

    const aiPromise = supabase.functions.invoke('gemini', {
      body: { action: 'import_recipe', payload: { recipeUrl: url, pageContent } }
    });

    const result = await Promise.race([aiPromise, timeoutPromise]) as any;
    const { data, error } = result;

    if (error) throw new Error(error.message || 'Supabase function failed');
    if (data?.error) throw new Error(data.error || 'API request failed');

    const text = data.text;
    if (!text) throw new Error('No content received from Gemini.');

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
