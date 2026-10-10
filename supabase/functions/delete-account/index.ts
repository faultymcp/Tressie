// supabase/functions/delete-account/index.ts
// Really deletes the signed-in user's account and data (Apple requires this).
// Deploy: npx supabase functions deploy delete-account

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// Tables holding the user's own rows (column user_id). Missing tables are skipped.
const USER_TABLES = [
  'user_routine_steps', 'routine_completions', 'user_routines', 'user_hair_profiles',
  'favourites', 'bookings', 'xp_ledger', 'xp_balances', 'wallet_transactions',
  'wallet_balances', 'user_subscriptions', 'discount_codes', 'referrals',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const jwt = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return reply({ error: 'Please sign in again, then delete your account.' }, 401);

  for (const table of USER_TABLES) {
    const { error } = await admin.from(table).delete().eq('user_id', user.id);
    if (error) console.log(`skip ${table}: ${error.message}`);
  }

  // Try-on log: keep the phone's daily count (so deleting an account can't reset
  // free try-ons) but drop anything that points at the person.
  const { error: tryonErr } = await admin.from('tryon_history')
    .update({ user_id: null, output_url: null }).eq('user_id', user.id);
  if (tryonErr) await admin.from('tryon_history').delete().eq('user_id', user.id);

  await admin.from('profiles').delete().eq('id', user.id);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('deleteUser failed', error.message);
    return reply({ error: 'We could not delete your account. Email support@lumaraelabs.com and we will do it for you.' }, 500);
  }
  return reply({ success: true });
});
