async function run() {
  const url = "https://www.simplyrecipes.com/watergate-salad-recipe-11932327";
  const req = await fetch('http://localhost:54321/functions/v1/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'import_recipe', payload: { recipeUrl: url, pageContent: '' } })
  });
  const res = await req.json();
  console.log(res);
}
run();
