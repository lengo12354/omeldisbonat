-- Read-only check after setup. Each total should match its owner count.
with owner_account as (
  select user_id from public.app_users where username = 'ayoub1234'
)
select 'clients' as section, count(*) as total, count(*) filter (where owner_id = (select user_id from owner_account)) as belonging_to_owner from public.clients
union all
select 'products', count(*), count(*) filter (where owner_id = (select user_id from owner_account)) from public.products
union all
select 'orders', count(*), count(*) filter (where owner_id = (select user_id from owner_account)) from public.orders
union all
select 'collections', count(*), count(*) filter (where owner_id = (select user_id from owner_account)) from public.collections;
