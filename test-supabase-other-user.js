require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  await supabase.auth.signInWithPassword({
    email: 'test_other_1711649646459@example.com', // wait I need a valid session
  });
  // I will just fetch as anon
  const { data, error } = await supabase.from('recipes').select('*').eq('id', 'test-123-1774717951916').single();
  console.log('Select Error:', error);
  console.log('Select Data:', data);
}

test();
