async function run() {
    const url = "https://www.simplyrecipes.com/watergate-salad-recipe-11932327";
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });
        console.log(response.status);
    } catch(e) {
        console.error(e);
    }
}
run();
