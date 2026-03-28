async function run() {
  const url = "https://www.simplyrecipes.com/watergate-salad-recipe-11932327";
  try {
    const response = await fetch(url, { headers: { Accept: 'text/html,application/xhtml+xml' } });
    if (!response.ok) throw new Error('Direct fetch failed');
    let html = await response.text();
    console.log("Direct fetch success, length:", html.length);
    html = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000);
    console.log("Processed length:", html.length);
    console.log("Preview:", html.substring(0, 100));
  } catch (e) {
    console.error("Direct fetch error:", e.message);
  }
}
run();
