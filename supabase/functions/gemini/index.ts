import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Heartbeat log
  console.log(`[Gemini Function] Received request: ${req.method} ${new Date().toISOString()}`);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[Gemini Function] Body received:', JSON.stringify(body).substring(0, 500));
    const { action, payload } = body;
    const API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured on the server');
    }

    const MODEL = 'gemini-1.5-flash';
    // Use v1 instead of v1beta for better stability with standard models
    const url = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${API_KEY}`;
    
    let promptText = '';
    let bodyData: any = { 
      contents: [{ parts: [] }],
      generationConfig: {
        temperature: 0.1,
      }
    };

    if (action === 'scan_ingredients') {
      const { base64Image } = payload;
      promptText = "Extract ingredients from this image of a recipe list. Return a JSON array of objects with 'name' (string), 'amount' (number), and 'unit' (string) keys. If amount is not specified, use 1. If unit is not specified, use 'piece'. Standardize units to: g, kg, ml, l, cup, tbsp, tsp, oz, lb, piece, pinch, clove, slice. Image might be handwritten or printed.";
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
      promptText = `Analyze the search query: "${query}" against this list of recipes. Identify which ones match (directly or conceptually). Return a JSON array of recipe IDs that match. Recipes: ${JSON.stringify(recipeList)}`;
      bodyData.contents[0].parts = [{ text: promptText }];
    } else if (action === 'import_recipe') {
      let { recipeUrl, pageContent } = payload;
      
      // If the client failed to fetch the page content due to CORS,
      // the edge function will attempt to fetch it directly
      if (!pageContent && recipeUrl) {
        console.log(`[Import] Fetching content for URL: ${recipeUrl}`);
        try {
          // Add timeout to prevent hanging the function
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const fetchRes = await fetch(recipeUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (fetchRes.ok) {
            const html = await fetchRes.text();
            console.log(`[Import] Successfully fetched HTML. Length: ${html.length}`);
            pageContent = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 15000); // 1.5-flash handles 1M tokens, but we keep it reasonable
            console.log(`[Import] Cleaned content length: ${pageContent.length}`);
          } else {
            console.warn(`[Import] Fetch failed with status: ${fetchRes.status}`);
          }
        } catch (e) {
          console.error("[Import] Edge function failed to fetch URL directly", e);
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
        ? `Extract a complete recipe from the following webpage text. Return ONLY a valid JSON object matching this schema: ${recipeSchema}. Do not include any explanations or conversational text. Webpage content:\n${pageContent}`
        : `Return ONLY a valid JSON object representing a recipe for this URL: ${recipeUrl}. Matching this schema: ${recipeSchema}. If you don't know the exact recipe, provide a sensible default based on the title in the URL. Do not include any text outside the JSON.`;
      
      bodyData.contents[0].parts = [{ text: promptText }];
    } else if (action === 'generate_pantry') {
      const { ingredients } = payload;
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
      
      promptText = `You are a creative executive chef. I have the following ingredients in my fridge/pantry: ${ingredients.join(', ')}. 
Create a delicious recipe that uses these ingredients. 
Return ONLY a valid JSON object matching this schema: ${recipeSchema}. No other text.`;
      
      bodyData.contents[0].parts = [{ text: promptText }];
    } else {
      throw new Error('Unknown action specified');
    }

    // List of models to try in order of preference
    const modelsToTry = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro',
      'gemini-pro',
      'gemini-1.0-pro-001'
    ];
    let lastError = '';
    let text = '';

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Gemini Function] Attempting model: ${modelName}`);
        // Try v1 first for these models
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${API_KEY}`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        });

        const data = await response.json();

        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          text = data.candidates[0].content.parts[0].text;
          console.log(`[Gemini Function] Success with model: ${modelName}`);
          break; 
        } else {
          lastError = data.error?.message || 'Unknown error';
          console.warn(`[Gemini Function] Model ${modelName} failed: ${lastError}`);
          continue;
        }
      } catch (e) {
        console.warn(`[Gemini Function] Network error with ${modelName}: ${e.message}`);
        lastError = e.message;
        continue;
      }
    }

    if (!text) {
      // Diagnostic check: Try to list available models
      try {
        const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`;
        const listRes = await fetch(listUrl);
        const listData = await listRes.json();
        console.log('[Diagnostic] Available models for this key:', JSON.stringify(listData.models?.map((m: any) => m.name)));
      } catch (e) {
        console.error('[Diagnostic] Failed to list models:', e.message);
      }
      throw new Error(`AI models unavailable. We tried: ${modelsToTry.join(', ')}. Details: ${lastError}`);
    }

    console.log(`[Gemini Function] Received response length: ${text.length}`);

    // Return the raw text back to the client
    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error: any) {
    console.error(`[Fatal Function Error] ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    );
  }
});
