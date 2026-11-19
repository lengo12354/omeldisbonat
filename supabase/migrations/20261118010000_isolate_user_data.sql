-- Run after the auth/settings migration and after creating the owner in app_users.
-- Existing rows are assigned to the account named below. No business rows are deleted.
begin;

alter table public.clients add column if not exists owner_id uuid references auth.users(id);
alter table public.products add column if not exists owner_id uuid references auth.users(id);
alter table public.orders add column if not exists owner_id uuid references auth.users(id);
alter table public.collections add column if not exists owner_id uuid references auth.users(id);

do $$
declare
  legacy_owner uuid;
begin
  select user_id into legacy_owner from public.app_users where username = 'aliali201988y';
  if legacy_owner is null then
    raise exception 'Create the aliali201988y owner account before assigning existing data';
  end if;

  update public.clients set owner_id = legacy_owner where owner_id is null;
  update public.products set owner_id = legacy_owner where owner_id is null;
  update public.orders set owner_id = legacy_owner where owner_id is null;
  update public.collections set owner_id = legacy_owner where owner_id is null;
end $$;

alter table public.clients alter column owner_id set default auth.uid();
alter table public.products alter column owner_id set default auth.uid();
alter table public.orders alter column owner_id set default auth.uid();
alter table public.collections alter column owner_id set default auth.uid();

alter table public.clients alter column owner_id set not null;
alter table public.products alter column owner_id set not null;
alter table public.orders alter column owner_id set not null;
alter table public.collections alter column owner_id set not null;

create index if not exists clients_owner_created_idx on public.clients (owner_id, created_at desc);
create index if not exists products_owner_created_idx on public.products (owner_id, created_at desc);
create index if not exists orders_owner_created_idx on public.orders (owner_id, created_at desc);
create index if not exists collections_owner_created_idx on public.collections (owner_id, created_at desc);

-- The order/client link must also stay inside one user's data.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clients_id_owner_unique' and conrelid = 'public.clients'::regclass) then
    alter table public.clients add constraint clients_id_owner_unique unique (id, owner_id);
  end if;
end $$;
alter table public.orders drop constraint if exists orders_client_id_fkey;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_client_owner_fkey' and conrelid = 'public.orders'::regclass) then
    alter table public.orders add constraint orders_client_owner_fkey
      foreign key (client_id, owner_id) references public.clients (id, owner_id)
      on delete set null (client_id);
  end if;
end $$;

drop policy if exists "Members can manage clients" on public.clients;
drop policy if exists "Members can manage products" on public.products;
drop policy if exists "Members can manage orders" on public.orders;
drop policy if exists "Members can manage collections" on public.collections;

drop policy if exists "Users manage own clients" on public.clients;
create policy "Users manage own clients" on public.clients for all to authenticated
  using (owner_id = (select auth.uid()) and exists (select 1 from public.app_users where user_id = (select auth.uid())))
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_users where user_id = (select auth.uid())));
drop policy if exists "Users manage own products" on public.products;
create policy "Users manage own products" on public.products for all to authenticated
  using (owner_id = (select auth.uid()) and exists (select 1 from public.app_users where user_id = (select auth.uid())))
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_users where user_id = (select auth.uid())));
drop policy if exists "Users manage own orders" on public.orders;
create policy "Users manage own orders" on public.orders for all to authenticated
  using (owner_id = (select auth.uid()) and exists (select 1 from public.app_users where user_id = (select auth.uid())))
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_users where user_id = (select auth.uid())));
drop policy if exists "Users manage own collections" on public.collections;
create policy "Users manage own collections" on public.collections for all to authenticated
  using (owner_id = (select auth.uid()) and exists (select 1 from public.app_users where user_id = (select auth.uid())))
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_users where user_id = (select auth.uid())));

commit;
