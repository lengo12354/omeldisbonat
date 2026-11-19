-- Apply this migration before enabling the login UI. Existing business rows remain shared
-- among accounts explicitly registered in app_users.

create table if not exists public.app_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  name text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_ai_settings (
  user_id uuid primary key references public.app_users(user_id) on delete cascade,
  provider text not null check (provider in ('gemini', 'groq')),
  api_key text not null check (length(api_key) > 0),
  updated_at timestamptz not null default now()
);

alter table public.app_users enable row level security;
alter table public.user_ai_settings enable row level security;

drop policy if exists "Users can read own membership" on public.app_users;
create policy "Users can read own membership" on public.app_users
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Users can read own AI settings" on public.user_ai_settings;
create policy "Users can read own AI settings" on public.user_ai_settings
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users can create own AI settings" on public.user_ai_settings;
create policy "Users can create own AI settings" on public.user_ai_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Users can update own AI settings" on public.user_ai_settings;
create policy "Users can update own AI settings" on public.user_ai_settings
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "Users can delete own AI settings" on public.user_ai_settings;
create policy "Users can delete own AI settings" on public.user_ai_settings
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.app_users, public.user_ai_settings from anon;
grant select on public.app_users to authenticated;
grant select, insert, update, delete on public.user_ai_settings to authenticated;

alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.collections enable row level security;

drop policy if exists "Enable all operations for clients" on public.clients;
drop policy if exists "Enable all operations for products" on public.products;
drop policy if exists "Enable all operations for orders" on public.orders;
drop policy if exists "Enable all operations for collections" on public.collections;

revoke all on public.clients, public.products, public.orders, public.collections from anon;
grant select, insert, update, delete on public.clients, public.products, public.orders, public.collections to authenticated;

drop policy if exists "Members can manage clients" on public.clients;
create policy "Members can manage clients" on public.clients for all to authenticated
  using (exists (select 1 from public.app_users where user_id = (select auth.uid())))
  with check (exists (select 1 from public.app_users where user_id = (select auth.uid())));
drop policy if exists "Members can manage products" on public.products;
create policy "Members can manage products" on public.products for all to authenticated
  using (exists (select 1 from public.app_users where user_id = (select auth.uid())))
  with check (exists (select 1 from public.app_users where user_id = (select auth.uid())));
drop policy if exists "Members can manage orders" on public.orders;
create policy "Members can manage orders" on public.orders for all to authenticated
  using (exists (select 1 from public.app_users where user_id = (select auth.uid())))
  with check (exists (select 1 from public.app_users where user_id = (select auth.uid())));
drop policy if exists "Members can manage collections" on public.collections;
create policy "Members can manage collections" on public.collections for all to authenticated
  using (exists (select 1 from public.app_users where user_id = (select auth.uid())))
  with check (exists (select 1 from public.app_users where user_id = (select auth.uid())));

-- Bootstrap exactly one owner after creating their account in Supabase Authentication:
-- insert into public.app_users (user_id, username, name, role)
-- values ('OWNER_AUTH_USER_UUID', 'aliali201988y', 'Owner name', 'owner');
