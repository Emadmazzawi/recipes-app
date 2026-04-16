import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const reqTime = new Date().toISOString();
  console.log(`[AI Function] Request received at ${reqTime}`);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, payload } = body;
    console.log(`[AI Function] Action: ${action}`);
    
    const API_KEY = Deno.env.get('GITHUB_TOKEN') || Deno.env.get('GEMINI_API_KEY');
    
    if (!API_KEY) {
      console.error('[Fatal] GITHUB_TOKEN/GEMINI_API_KEY is missing');
      throw new Error('API Token is not configured on the server. Please check Supabase Secrets.');
    }

    const MODEL = 'gpt-4o-mini';
    const GITHUB_MODELS_URL = `https://models.inference.ai.azure.com/chat/completions`;
    
    let messages: any[] = [];

    if (action === 'scan_ingredients') {
      const { base64Image } = payload;
      if (!base64Image) throw new Error('Missing base64Image in payload');
      
      messages = [{
        role: "user",
        content: [
          { type: "text", text: "Extract ingredients from this recipe list. Return a JSON object with a single key 'ingredients' containing an array of objects: {name, amount, unit}. Use 1 for missing amounts, 'piece' for missing units." },
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
      // Critical: Enforce exact ID matching
      const promptText = `Analyze search query: "${query}" against the following recipe list. 
Identify which ones match. 
CRITICAL: You MUST use the EXACT "id" string provided for each recipe (e.g., 'builtin-1'). Do NOT change it to a number.
Return ONLY a JSON object with a key 'results' where keys are recipe IDs and values are a 1-sentence reason why it matches.
Recipes: ${JSON.stringify(recipeList)}`;
      
      messages = [{ role: "user", content: promptText }];
    } else if (action === 'import_recipe') {
      let { recipeUrl, pageContent } = payload;
      
      if (!pageContent && recipeUrl && recipeUrl.startsWith('http')) {
        console.log(`[Import] Scraping: ${recipeUrl}`);
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          
          const fetchRes = await fetch(recipeUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/*;q=0.8',
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (fetchRes.ok) {
            const html = await fetchRes.text();
            
            // Extract JSON-LD
            const ldJsonMatches = html.matchAll(/<script\b[^>]*type=['"]application\/ld\+json['"][^>]*>([\s\S]*?)<\/script>/gi);
            let ldJsonContent = '';
            for (const match of ldJsonMatches) {
               const content = match[1].trim();
               if (content.includes('Recipe') || content.includes('"@type"')) {
                 ldJsonContent += content + '\n';
               }
            }

            const cleanText = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 15000);
            
            pageContent = ldJsonContent 
              ? `JSON-LD DATA:\n${ldJsonContent}\n\nPAGE TEXT:\n${cleanText}`
              : cleanText;
            
            console.log(`[Import] Scrape successful. Data length: ${pageContent.length}`);
          } else {
            console.warn(`[Import] Fetch failed status: ${fetchRes.status}`);
          }
        } catch (e) {
          console.error(`[Import] Scrape error: ${e.message}`);
        }
      }

      const recipeSchema = `{
        "recipe": {
          "title": "string",
          "description": "string",
          "servings": number,
          "prepTime": number,
          "cookTime": number,
          "category": "Main|Dessert|Baking|Soup|Salad|Breakfast|Other",
          "ingredients": [{"name": "string", "amount": number, "unit": "string"}],
          "steps": ["string"]
        }
      }`;
      
      const promptText = pageContent && pageContent.length > 50
        ? `Extract a recipe from the provided data. Return ONLY JSON matching this schema: ${recipeSchema}. Webpage data:\n${pageContent.substring(0, 8000)}`
        : `Generate a recipe for ${recipeUrl || 'a mystery dish'}. Match this schema: ${recipeSchema}.`;
      
      messages = [{ role: "user", content: promptText }];
    } else if (action === 'generate_pantry') {
      const { ingredients } = payload;
      const recipeSchema = `{"recipe": {"title": "string", "description": "string", "servings": number, "prepTime": number, "cookTime": number, "category": "string", "ingredients": [{"name": "string", "amount": number, "unit": "string"}], "steps": ["string"]}}`;
      messages = [{ role: "user", content: `Chef, create a recipe using: ${ingredients.join(', ')}. Return ONLY JSON matching: ${recipeSchema}` }];
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[AI Function] Contacting GitHub Models...`);
    
    const response = await fetch(GITHUB_MODELS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        response_format: { "type": "json_object" },
        temperature: 0.1,
        max_tokens: 4096
      }),
    });

    const data = await response.json();

    if (!response.ok) {
       console.error(`[AI Function] GitHub API Error:`, JSON.stringify(data));
       const errorMsg = data.error?.message || data.message || `API error ${response.status}`;
       throw new Error(`AI Service Error: ${errorMsg}`);
    }

    const choice = data.choices?.[0];
    const text = choice?.message?.content;
    const finishReason = choice?.finish_reason;

    if (!text) {
      console.error(`[AI Function] No content in response:`, JSON.stringify(data));
      throw new Error('AI returned an empty response.');
    }

    console.log(`[AI Function] Model successful. Finish Reason: ${finishReason}. Length: ${text.length}`);
    
    if (finishReason === 'length') {
       console.warn(`[AI Function] WARNING: Response was truncated due to token limit!`);
    }
    
    // Normalize response for frontend
    try {
       const parsedText = JSON.parse(text);
       if (action === 'smart_search' && (parsedText.results || parsedText.matching_ids)) {
          text = JSON.stringify(parsedText.results || parsedText.matching_ids);
       } else if (action === 'scan_ingredients' && parsedText.ingredients) {
          text = JSON.stringify(parsedText.ingredients);
       } else if (parsedText.recipe) {
          text = JSON.stringify(parsedText.recipe);
       } else {
          text = JSON.stringify(parsedText);
       }
    } catch (e) {
       console.log("[AI Function] JSON normalization skipped.", e.message);
    }

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error: any) {
    console.error(`[Fatal Function Error] ${error.message}`);
    const errorBody = { 
      error: error.message, 
      details: "Check Supabase Dashboard logs for [AI Function] stack trace." 
    };
    return new Response(
      JSON.stringify(errorBody),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    );
  }
});
