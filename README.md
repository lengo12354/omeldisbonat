# Omeldis Dashboard

Local React/Vite dashboard backed by Supabase. The application does not include a shared AI API key.

## Local development

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`.
2. Run `npm install` and `npm run dev`.

## Activate login and settings

The new login screen requires a Supabase owner account and database migration. Do these steps in order before using the updated app:

1. Create the owner account in **Supabase Dashboard → Authentication → Users** with the owner's e-mail and password. This e-mail is only used internally by Supabase; users sign in with a username. Do not enable public sign-up for this app.
2. Run [`supabase/migrations/20261118000000_auth_settings.sql`](supabase/migrations/20261118000000_auth_settings.sql) in the Supabase SQL Editor. It adds the account and per-user AI settings tables and removes the old public data policies.
3. Run this statement in the SQL Editor, replacing `OWNER_EMAIL` with the e-mail used in step 1:

   ```sql
   insert into public.app_users (user_id, username, name, role)
   select id, 'aliali201988y', 'Owner', 'owner'
   from auth.users where email = 'OWNER_EMAIL';
   ```

4. Run [`supabase/migrations/20261118010000_isolate_user_data.sql`](supabase/migrations/20261118010000_isolate_user_data.sql) in the SQL Editor. It assigns all existing clients, products, orders, and collections to `aliali201988y`, then restricts every row to its owner. The migration runs in one transaction and does not delete business data. If another account should receive the old data, change the username inside this migration before running it.
5. Deploy both Edge Functions. `login-username` is public so users can submit their credentials; it verifies the password with Supabase Auth. `admin-users` requires an admin session and verifies its JWT:

   ```sh
   supabase functions deploy login-username
   supabase functions deploy admin-users
   ```

   Or use **Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor**. Create `login-username` and `admin-users`, paste each function's `index.ts` from this repository, and deploy. In the function settings, turn **JWT verification off only for `login-username`**. Keep it on for `admin-users`.

6. Create a separate administrator in **Authentication → Users**. Before running [`supabase/migrations/20261118020000_separate_admin.sql`](supabase/migrations/20261118020000_separate_admin.sql), replace its `__ADMIN_EMAIL__` and `__ADMIN_USERNAME__` placeholders. This gives the new account the admin role and renames the existing business login to `ayoub1234`. Existing business data stays assigned to the same account ID.
7. Deploy the updated `admin-users` function. Sign in with the admin username and password to open the separate user-management dashboard. It lists accounts, creates new users, and lets the admin change a member's password (12 characters minimum). The admin cannot open the sales dashboard or read business rows. Other users see only their own clients, products, orders, collections, and AI keys. Without their own AI key, the assistant asks them to add one.

The `admin-users` function uses the server-side Supabase service-role/secret key supplied to Edge Functions. Never place this key in a `VITE_` variable or browser code. The existing AI key that used to be in source code should be rotated at its provider.

## Appearance

**Paramètres → Apparence** switches between dark and light themes. The choice is saved in that browser.
