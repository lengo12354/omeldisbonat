import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
};

function respond(body: object, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (!['GET', 'POST', 'PATCH'].includes(request.method)) return respond({ error: 'Méthode non autorisée.' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY');
  if (!url || !anonKey || !serviceKey) return respond({ error: 'Configuration serveur manquante.' }, 500);

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return respond({ error: 'Connexion requise.' }, 401);
  const authClient = createClient(url, anonKey);
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return respond({ error: 'Session invalide.' }, 401);

  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: owner, error: ownerError } = await adminClient.from('app_users')
    .select('role').eq('user_id', user.id).maybeSingle();
  if (ownerError || owner?.role !== 'admin') return respond({ error: 'Accès réservé à l’administrateur.' }, 403);

  if (request.method === 'GET') {
    const { data: users, error: listError } = await adminClient.from('app_users')
      .select('user_id, username, name, role, created_at').order('created_at', { ascending: true });
    if (listError) return respond({ error: 'Impossible de charger les utilisateurs.' }, 500);
    return respond({ users });
  }

  if (request.method === 'PATCH') {
    let input: { userId?: unknown; password?: unknown };
    try { input = await request.json(); } catch { return respond({ error: 'Données invalides.' }, 400); }
    const userId = typeof input.userId === 'string' ? input.userId : '';
    const password = typeof input.password === 'string' ? input.password : '';
    if (!/^[0-9a-f-]{36}$/i.test(userId) || password.length < 12 || password.length > 128) {
      return respond({ error: 'Mot de passe invalide (12 caractères minimum).' }, 400);
    }
    const { data: target, error: targetError } = await adminClient.from('app_users')
      .select('role').eq('user_id', userId).maybeSingle();
    if (targetError || target?.role !== 'member') return respond({ error: 'Utilisateur introuvable.' }, 404);
    const { error: resetError } = await adminClient.auth.admin.updateUserById(userId, { password });
    if (resetError) return respond({ error: 'Impossible de changer le mot de passe.' }, 500);
    return respond({ updated: true });
  }

  let input: { name?: unknown; username?: unknown; password?: unknown };
  try { input = await request.json(); } catch { return respond({ error: 'Données invalides.' }, 400); }
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  if (!name || name.length > 100 || !/^[a-z0-9._-]{3,32}$/.test(username) || password.length < 12 || password.length > 128) {
    return respond({ error: 'Nom, identifiant ou mot de passe invalide (12 caractères minimum).' }, 400);
  }

  const { data: existing } = await adminClient.from('app_users').select('user_id').eq('username', username).maybeSingle();
  if (existing) return respond({ error: 'Cet identifiant est déjà utilisé.' }, 409);
  // Supabase Auth requires an e-mail identifier internally; it is never shown as the login name.
  const email = `${crypto.randomUUID()}@example.com`;
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true });
  if (createError || !created.user) return respond({ error: 'Impossible de créer ce compte.' }, 500);
  const { error: memberError } = await adminClient.from('app_users').insert({ user_id: created.user.id, username, name, role: 'member' });
  if (memberError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return respond({ error: 'Impossible d’autoriser ce compte.' }, 500);
  }
  return respond({ id: created.user.id, username });
});
