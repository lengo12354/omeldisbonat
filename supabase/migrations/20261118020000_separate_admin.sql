-- Replace the two placeholders below before running this migration.
-- The admin Auth user must already exist. Existing business rows keep the same owner ID
-- while that owner's login changes from aliali201988y to ayoub1234.
begin;

alter table public.app_users drop constraint if exists app_users_role_check;
alter table public.app_users add constraint app_users_role_check check (role in ('admin', 'owner', 'member'));

do $$
declare
  admin_id uuid;
begin
  if position('__ADMIN_' in '__ADMIN_EMAIL__') > 0 or position('__ADMIN_' in '__ADMIN_USERNAME__') > 0 then
    raise exception 'Replace __ADMIN_EMAIL__ and __ADMIN_USERNAME__ first';
  end if;
  if '__ADMIN_USERNAME__' !~ '^[a-z0-9._-]{3,32}$' then
    raise exception 'Admin username must use 3-32 lowercase letters, numbers, dots, underscores, or hyphens';
  end if;
  select id into admin_id from auth.users where lower(email) = lower('__ADMIN_EMAIL__');
  if admin_id is null then
    raise exception 'Admin e-mail not found in Supabase Authentication Users';
  end if;
  if not exists (select 1 from public.app_users where username = 'aliali201988y') then
    raise exception 'Existing data owner aliali201988y was not found';
  end if;
  insert into public.app_users (user_id, username, name, role)
  values (admin_id, '__ADMIN_USERNAME__', 'Admin', 'admin')
  on conflict (user_id) do update set username = excluded.username, name = excluded.name, role = excluded.role;
  update public.app_users set username = 'ayoub1234', name = 'Ayoub', role = 'member'
  where username = 'aliali201988y';
end $$;

drop policy if exists "Users manage own clients" on public.clients;
drop policy if exists "Users manage own products" on public.products;
drop policy if exists "Users manage own orders" on public.orders;
drop policy if exists "Users manage own collections" on public.collections;
drop policy if exists "Members can manage clients" on public.clients;
drop policy if exists "Members can manage products" on public.products;
drop policy if exists "Members can manage orders" on public.orders;
drop policy if exists "Members can manage collections" on public.collections;

create policy "Business users manage own clients" on public.clients for all to authenticated
  using (owner_id = (select auth.uid()) and exists (select 1 from public.app_users where user_id = (select auth.uid()) and role in ('member', 'owner')))
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_users where user_id = (select auth.uid()) and role in ('member', 'owner')));
create policy "Business users manage own products" on public.products for all to authenticated
  using (owner_id = (select auth.uid()) and exists (select 1 from public.app_users where user_id = (select auth.uid()) and role in ('member', 'owner')))
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_users where user_id = (select auth.uid()) and role in ('member', 'owner')));
create policy "Business users manage own orders" on public.orders for all to authenticated
  using (owner_id = (select auth.uid()) and exists (select 1 from public.app_users where user_id = (select auth.uid()) and role in ('member', 'owner')))
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_users where user_id = (select auth.uid()) and role in ('member', 'owner')));
create policy "Business users manage own collections" on public.collections for all to authenticated
  using (owner_id = (select auth.uid()) and exists (select 1 from public.app_users where user_id = (select auth.uid()) and role in ('member', 'owner')))
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_users where user_id = (select auth.uid()) and role in ('member', 'owner')));

commit;
