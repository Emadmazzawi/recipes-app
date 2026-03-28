require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  // User 1
  const email1 = 'user1_' + Date.now() + '@example.com';
  const { data: d1 } = await supabase.auth.signUp({ email: email1, password: 'password123' });
  const uid1 = d1.user.id;
  
  const rid = 'recipe-' + Date.now();
  await supabase.from('recipes').insert([{ id: rid, user_id: uid1, title: 'My Shared Recipe' }]);
  
  // User 2
  const email2 = 'user2_' + Date.now() + '@example.com';
  const { data: d2 } = await supabase.auth.signUp({ email: email2, password: 'password123' });
  
  // As User 2 (the client now has user 2's session because signUp auto-logs in)
  const { data: selData, error: selError } = await supabase.from('recipes').select('*').eq('id', rid);
  console.log('Select by User 2 - Error:', selError);
  console.log('Select by User 2 - Data:', selData);
  
  const { data: allData, error: allError } = await supabase.from('recipes').select('*');
  console.log('Select ALL by User 2 - Data count:', allData ? allData.length : 0);
}

test();
