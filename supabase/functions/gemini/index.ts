import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Heartbeat log
  console.log(`[AI Function] Received request: ${req.method} ${new Date().toISOString()}`);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[AI Function] Body received:', JSON.stringify(body).substring(0, 500));
    const { action, payload } = body;
    
    // Check for GITHUB_TOKEN or fallback to GEMINI_API_KEY
    const API_KEY = Deno.env.get('GITHUB_TOKEN') || Deno.env.get('GEMINI_API_KEY');
    
    if (!API_KEY) {
      throw new Error('GITHUB_TOKEN is not configured on the server');
    }

    const MODEL = 'gpt-4o-mini';
    const GITHUB_MODELS_URL = `https://models.inference.ai.azure.com/chat/completions`;
    
    let messages: any[] = [];
    const responseFormat = { "type": "json_object" };

    if (action === 'scan_ingredients') {
      const { base64Image } = payload;
      const promptText = "Extract ingredients from this image of a recipe list. Return a JSON object with a single key 'ingredients' which is an array of objects. Each object should have 'name' (string), 'amount' (number), and 'unit' (string) keys. If amount is not specified, use 1. If unit is not specified, use 'piece'. Standardize units to: g, kg, ml, l, cup, tbsp, tsp, oz, lb, piece, pinch, clove, slice. Image might be handwritten or printed.";
      
      messages = [{
        role: "user",
        content: [
          { type: "text", text: promptText },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }];
    } else if (action === 'smart_search') {
      const { query, recipes } = payload;
      const recipeList = recipes.map((r: any) => ({
        id: r.id,
        title: r.title,
        ingredients: r.ingredients.map((i: any) => i.name).join(', '),
      }));
      const promptText = `Analyze search query: "${query}" against these recipes. Identify which match (directly or conceptually). Return ONLY a JSON object with a key 'results' where keys are recipe IDs and values are very brief reasons (max 10 words) why they match. Recipes: ${JSON.stringify(recipeList)}`;
      
      messages = [{ role: "user", content: promptText }];
    } else if (action === 'import_recipe') {
      let { recipeUrl, pageContent } = payload;
      
      if (!pageContent && recipeUrl) {
        console.log(`[Import] Fetching content for URL: ${recipeUrl}`);
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);
          
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
            
            // Extract JSON-LD (high quality recipe data often found here)
            const ldJsonMatches = html.matchAll(/<script\b[^>]*type=['"]application\/ld\+json['"][^>]*>([\s\S]*?)<\/script>/gi);
            let ldJsonContent = '';
            for (const match of ldJsonMatches) {
               ldJsonContent += match[1] + '\n';
            }
            if (ldJsonContent) {
               console.log(`[Import] Found JSON-LD content. Length: ${ldJsonContent.length}`);
            }

            const cleanText = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 15000);
            
            pageContent = ldJsonContent 
              ? `JSON-LD DATA:\n${ldJsonContent}\n\nPAGE TEXT:\n${cleanText}`.substring(0, 30000)
              : cleanText;
              
            console.log(`[Import] Prepared content length: ${pageContent.length}`);
          } else {
            console.warn(`[Import] Fetch failed with status: ${fetchRes.status}`);
          }
        } catch (e) {
          console.error("[Import] Edge function failed to fetch URL directly", e);
        }
      }

      const recipeSchema = `{
        "recipe": {
          "title": "string",
          "description": "string",
          "servings": number,
          "prepTime": number,
          "cookTime": number,
          "category": "Breakfast|Main|Appetizer|Dessert|Baking|Soup|Salad|Drinks|Other",
          "ingredients": [{"name": "string", "amount": number, "unit": "string"}],
          "steps": ["string"]
        }
      }`;
      
      const promptText = pageContent
        ? `Extract a complete recipe from the provided data. Return ONLY a valid JSON object matching this exact schema: ${recipeSchema}. Do not include any explanations. Webpage content:\n${pageContent}`
        : `Return ONLY a valid JSON object representing a recipe for this URL: ${recipeUrl}. Matching this exact schema: ${recipeSchema}. If you don't know the exact recipe, provide a sensible default based on the title in the URL. Do not include any text outside the JSON.`;
      
      messages = [{ role: "user", content: promptText }];
    } else if (action === 'generate_pantry') {
      const { ingredients } = payload;
      const recipeSchema = `{
        "recipe": {
          "title": "string",
          "description": "string",
          "servings": number,
          "prepTime": number,
          "cookTime": number,
          "category": "Main|Appetizer|Dessert|Baking|Soup|Salad|Breakfast|Drinks|Other",
          "ingredients": [{"name": "string", "amount": number, "unit": "string"}],
          "steps": ["string"]
        }
      }`;
      
      const promptText = `You are a creative executive chef. I have the following ingredients: ${ingredients.join(', ')}. 
Create a delicious recipe using them. Return ONLY a valid JSON object matching this exact schema: ${recipeSchema}. No other text.`;
      
      messages = [{ role: "user", content: promptText }];
    } else {
      throw new Error('Unknown action specified');
    }

    const requestBody = {
      model: MODEL,
      messages: messages,
      response_format: responseFormat,
      temperature: 0.1
    };

    console.log(`[AI Function] Sending request to GitHub Models API (${MODEL})`);
    
    let text = '';
    
    try {
      const response = await fetch(GITHUB_MODELS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.choices?.[0]?.message?.content) {
        text = data.choices[0].message.content;
        console.log(`[AI Function] Success with model: ${MODEL}`);
        
        // Un-nest the response to match what the frontend expects
        try {
           const parsedText = JSON.parse(text);
           if (action === 'smart_search' && parsedText.results) {
              text = JSON.stringify(parsedText.results);
           } else if (action === 'scan_ingredients' && parsedText.ingredients) {
              text = JSON.stringify(parsedText.ingredients);
           } else if (parsedText.recipe) {
              text = JSON.stringify(parsedText.recipe);
           } else {
              text = JSON.stringify(parsedText);
           }
        } catch (e) {
           console.log("[AI Function] JSON normalization failed, proceeding with raw.", e);
        }
      } else {
        const errorMsg = data.error?.message || 'Unknown error API';
        console.warn(`[AI Function] Model ${MODEL} failed: ${errorMsg}`);
        throw new Error(`AI model failed: ${errorMsg}`);
      }
    } catch (e: any) {
      console.warn(`[AI Function] Processing error: ${e.message}`);
      throw e;
    }

    if (!text) {
      throw new Error(`AI models unavailable.`);
    }

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
