# EasyOrder

A small everyday-goods storefront and checkout built with Next.js, Supabase (Postgres + Google OAuth), and Mailgun. Product inventory, signed-in carts, orders, and order items are stored in Supabase. The order RPC checks prices and inventory and writes the order atomically. The checkout demo does not collect or process card details; connect a payment provider before accepting real payments.

## Run locally

1. Install Node.js 20.9 or newer from [nodejs.org](https://nodejs.org/). This workspace did not have Node/npm available when the project was created.
2. In this folder, run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the service values below.
4. Apply `supabase/migrations/202610020001_shop.sql` in the Supabase SQL Editor.
5. Configure Google OAuth and the Mailgun sender using the steps below.
6. Run `npm run dev` and open the local URL printed by Next.js.

## Setup from your end

### 1. Create the Supabase project

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard) and choose a database password you can store securely.
2. In **Project Settings → API**, copy the Project URL and the `anon` / publishable key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
3. Copy the `service_role` key into `SUPABASE_SERVICE_ROLE_KEY`. It bypasses row-level security: keep it server-only, never prefix it with `NEXT_PUBLIC_`, and never commit `.env.local`.
4. Open **SQL Editor**, paste the migration file, and run it. This creates the catalog, cart, order tables, security policies, order function, and four sample products.

### 2. Enable Google sign-in

1. Open [Google Cloud Console](https://console.cloud.google.com/), create/select a project, then configure the OAuth consent screen. Set the app name and support email; add test users while the app is in testing.
2. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application**.
3. In the Supabase dashboard, open **Authentication → Providers → Google** and copy its callback URL.
4. Add that Supabase callback URL to the Google OAuth client's **Authorized redirect URIs**. Add your local/deployed site origins to **Authorized JavaScript origins** (for example `http://localhost:3000` and `https://your-shop.example`).
5. Copy the Google client ID and client secret into the Supabase Google provider settings and save.
6. In Supabase **Authentication → URL Configuration**, set the Site URL to your deployed origin and add `http://localhost:3000/**` plus the deployed origin callback pattern to the redirect allow list.

### 3. Set up Mailgun confirmations

1. Create a Mailgun account and add a sending domain under **Sending → Domains**.
2. Publish the DNS records Mailgun provides (usually SPF, DKIM, and tracking records) with your domain provider. Wait until Mailgun verifies the domain.
3. Copy a Mailgun API key into `MAILGUN_API_KEY`, the verified domain into `MAILGUN_DOMAIN`, and a sender address authorized for that domain into `MAILGUN_FROM`.
4. Set `MAILGUN_REGION` to `api` for US or `api.eu` for EU. The endpoint uses the Mailgun API key only on the server.
5. Send a test order after sign-in and check both the app response and Mailgun **Sending → Logs**.

### 4. Deploy to Netlify

1. Push the project to GitHub and open [Netlify](https://app.netlify.com/). Choose **Add new site → Import an existing project**, connect GitHub, and select `jesseK2/EasyOrder`.
2. Keep the build command as `npm run build` and the publish directory as `.next`. The included `netlify.toml` enables Netlify's Next.js runtime plugin for pages and API routes.
3. Before the first deploy, add these in **Site configuration → Environment variables**:
	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	- `SUPABASE_SERVICE_ROLE_KEY`
	- `MAILGUN_API_KEY`
	- `MAILGUN_DOMAIN`
	- `MAILGUN_FROM`
	- `MAILGUN_REGION`
4. Set the `NEXT_PUBLIC_` values to the Supabase project URL and publishable/anon key. Keep the service-role and Mailgun keys server-only. Never put secrets in GitHub or prefix them with `NEXT_PUBLIC_`.
5. Choose **Deploy site**. Netlify will build and publish the site at a `*.netlify.app` URL.
6. In Supabase **Authentication → URL Configuration**, set the Site URL to the Netlify site origin and add `https://YOUR-SITE.netlify.app/**` to the redirect allow list. Keep the local development URL there too if you still test locally.
7. Add `https://YOUR-SITE.netlify.app` as an authorized JavaScript origin in Google Cloud. The Google OAuth client's authorized redirect URI stays the Supabase callback URL shown in Supabase's Google provider settings.
8. For later code changes, push to GitHub and Netlify will build a new deploy automatically. Apply SQL migrations in Supabase before deploying application changes that depend on them.

## Important before taking real orders

- A payment provider is not connected yet. Add Stripe or another provider, verify payment server-side, and only then mark orders paid/fulfillable.
- Replace the sample catalog, prices, stock levels, and image URLs with your own products and licensed photography.
- Add your actual shipping, returns, privacy, and terms content. The current checkout is US-only and uses a flat $7 shipping fee under $75.
- The sample newsletter form is a visual placeholder and does not save email addresses.
- Consider setting Mailgun webhook handling and retrying transient email failures before launch.