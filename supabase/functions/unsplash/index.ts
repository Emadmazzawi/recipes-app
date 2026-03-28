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
    const { query } = await req.json();
    const API_KEY = Deno.env.get('UNSPLASH_ACCESS_KEY');
    
    if (!API_KEY) {
      throw new Error('UNSPLASH_ACCESS_KEY is not configured on the server');
    }

    // Clean up the query - remove words like "recipe" or "how to make" for better results
    const cleanQuery = query.toLowerCase()
      .replace(/recipe/g, '')
      .replace(/how to make/g, '')
      .replace(/easy/g, '')
      .replace(/quick/g, '')
      .trim();

    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(cleanQuery)}&per_page=1&orientation=landscape`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 
        'Authorization': `Client-ID ${API_KEY}`,
        'Accept-Version': 'v1'
      }
    });

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(data.errors.join(', '));
    }

    let imageUrl = null;
    if (data.results && data.results.length > 0) {
       // Get regular sized image, usually ~1080px width which is perfect for mobile
       imageUrl = data.results[0].urls.regular;
    }

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    );
  }
});