require('dotenv').config();

async function test() {
  const res = await fetch(process.env.EXPO_PUBLIC_SUPABASE_URL + '/rest/v1/', {
    headers: {
      'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    }
  });
  const text = await res.text();
  console.log(text.substring(0, 500));
}

test();
