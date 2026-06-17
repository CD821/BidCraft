# Supabase + Vercel Setup

BidCraft v0.7 connects the Vite app to Supabase Auth and Postgres when the
Vercel environment variables are present.

## What v0.7 Includes

- Email/password sign up and sign in through Supabase Auth.
- Company workspace for creating companies and requesting access.
- Company-scoped projects, price books, trades, and proposal settings.
- Owner/admin join-request approval.
- Change logs for project, price-book, and company-setting changes.
- Local/offline fallback when Supabase variables are not configured.

## Intended Access Model

- A user signs up or logs in with Supabase Auth.
- A user can create a company.
- A user can request to join a company.
- Company owners/admins approve users and assign roles.
- Each company has its own projects and price book.
- Platform admins can list all companies.
- Audit logs record inserts, updates, and deletes for company projects,
  price-book items, and company settings.

## Supabase Setup

1. Open your Supabase project.
2. Go to `SQL Editor`.
3. Paste and run `supabase/schema.sql`.
4. Go to `Authentication > URL Configuration`.
5. Add your Vercel URL to the allowed redirect URLs.
6. Create your first user account in the deployed app.
7. In Supabase SQL Editor, make yourself platform admin:

```sql
update public.profiles
set is_platform_admin = true
where email = 'your-email@example.com';
```

## Vercel Setup

1. Import the GitHub repo into Vercel.
2. Framework preset: `Vite`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add environment variables from `.env.example`:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

6. Deploy.

## Updating Later

Push or upload the updated source files to GitHub. Vercel will rebuild from the
`main` branch automatically. If you change Supabase SQL, rerun
`supabase/schema.sql` in Supabase SQL Editor first.

## Free-Tier Notes

This can start on free Supabase and free Vercel. The practical limits will be
database size, file bandwidth, and inactivity pauses. For a small group of
friends testing estimates, the free tiers are a good starting point.
