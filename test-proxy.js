async function run() {
  const url = "https://www.simplyrecipes.com/watergate-salad-recipe-11932327";
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  console.log("Trying proxy:", proxyUrl);
  try {
    const proxyResponse = await fetch(proxyUrl);
    if (proxyResponse.ok) {
      const proxyData = await proxyResponse.json();
      let html = proxyData.contents || '';
      console.log("Proxy fetch success, length:", html.length);
      html = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 8000);
      console.log("Processed length:", html.length);
      console.log("Preview:", html.substring(0, 100));
    } else {
      console.log("Proxy failed:", proxyResponse.status);
    }
  } catch(e) {
    console.error("Proxy error", e);
  }
}
run();
