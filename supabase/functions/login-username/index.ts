import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respond(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return respond({ error: 'Méthode non autorisée.' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY');
  if (!url || !anonKey || !serviceKey) return respond({ error: 'Configuration serveur manquante.' }, 500);

  let input: { username?: unknown; password?: unknown };
  try { input = await request.json(); } catch { return respond({ error: 'Identifiants invalides.' }, 400); }
  const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  if (!/^[a-z0-9._-]{3,32}$/.test(username) || !password || password.length > 128) {
    return respond({ error: 'Identifiants invalides.' }, 401);
  }

  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: member, error: memberError } = await adminClient.from('app_users')
    .select('user_id').eq('username', username).maybeSingle();
  if (memberError || !member) return respond({ error: 'Identifiants invalides.' }, 401);
  const { data: account, error: accountError } = await adminClient.auth.admin.getUserById(member.user_id);
  if (accountError || !account.user?.email) return respond({ error: 'Identifiants invalides.' }, 401);

  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await authClient.auth.signInWithPassword({ email: account.user.email, password });
  if (error || !data.session) return respond({ error: 'Identifiants invalides.' }, 401);
  return respond({ session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
});
