import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();
    const API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured on the server');
    }

    const MODEL = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    
    let promptText = '';
    let bodyData: any = { contents: [{ parts: [] }] };

    if (action === 'scan_ingredients') {
      const { base64Image } = payload;
      promptText = "Extract ingredients from this image of a recipe list. Return ONLY a JSON array of objects with 'name' (string), 'amount' (number), and 'unit' (string) keys. If amount is not specified, use 1. If unit is not specified, use 'piece'. Standardize units to: g, kg, ml, l, cup, tbsp, tsp, oz, lb, piece, pinch, clove, slice. Image might be handwritten or printed. Output only the JSON array.";
      bodyData.contents[0].parts = [
        { text: promptText },
        { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
      ];
    } else if (action === 'smart_search') {
      const { query, recipes } = payload;
      const recipeList = recipes.map((r: any) => ({
        id: r.id,
        title: r.title,
        ingredients: r.ingredients.map((i: any) => i.name).join(', '),
      }));
      promptText = `Analyze the search query: "${query}" against this list of recipes. Identify which ones match (directly or conceptually). Return ONLY a JSON object where keys are recipe IDs and values are a short one-sentence explanation of why it matches. Recipes: ${JSON.stringify(recipeList)}`;
      bodyData.contents[0].parts = [{ text: promptText }];
    } else if (action === 'import_recipe') {
      let { recipeUrl, pageContent } = payload;
      
      // If the client failed to fetch the page content due to CORS,
      // the edge function will attempt to fetch it directly
      if (!pageContent && recipeUrl) {
        try {
          const fetchRes = await fetch(recipeUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml',
            }
          });
          if (fetchRes.ok) {
            const html = await fetchRes.text();
            pageContent = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 8000);
          }
        } catch (e) {
          console.error("Edge function failed to fetch URL directly", e);
        }
      }

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
      
      promptText = pageContent
        ? `Extract a complete recipe from the following webpage text. Return ONLY a JSON object matching this schema: ${recipeSchema}\n\nWebpage content:\n${pageContent}`
        : `Extract the complete recipe from this URL: ${recipeUrl}. Return ONLY a JSON object matching this schema: ${recipeSchema}. If a field is missing, provide a sensible default. Output only valid JSON.`;
      
      bodyData.contents[0].parts = [{ text: promptText }];
    } else {
      throw new Error('Unknown action specified');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'API request failed');

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No content received from Gemini.');

    // We'll return the raw text back to the client so it can do the regex matching / parsing
    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    );
  }
});
