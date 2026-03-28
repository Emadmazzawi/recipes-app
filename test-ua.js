async function run() {
  const url = "https://www.simplyrecipes.com/watergate-salad-recipe-11932327";
  try {
    const response = await fetch(url, { 
      headers: { 
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.5'
      } 
    });
    if (!response.ok) throw new Error('Direct fetch failed: ' + response.status);
    let html = await response.text();
    console.log("Direct fetch success, length:", html.length);
  } catch (e) {
    console.error("Direct fetch error:", e.message);
  }
}
run();
