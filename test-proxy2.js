async function run() {
  const url = "https://www.simplyrecipes.com/watergate-salad-recipe-11932327";
  const proxies = [
    `https://api.microlink.io/?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`
  ];
  
  for (let p of proxies) {
    console.log("Trying", p);
    try {
      const res = await fetch(p);
      console.log("Status:", res.status);
      if (res.ok) {
        if (p.includes('microlink')) {
            const data = await res.json();
            console.log("Success microlink", data.status);
        } else {
            console.log("Success html length:", (await res.text()).length);
        }
      }
    } catch(e) {
      console.log("Failed", e.message);
    }
  }
}
run();
