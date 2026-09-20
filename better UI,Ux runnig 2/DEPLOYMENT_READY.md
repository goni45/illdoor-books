# Deploy-ready steps

1. Run `schema-model-listing-production-fixes.sql` once in Supabase SQL Editor.
2. Run `schema-model-listing-production-smoke-test.sql`; failure counts should be 0.
3. Copy `.env.example` to `.env.local` and set the public Supabase URL and anon/publishable key.
4. Use Node 20.19+: `npm ci`, `npm run lint`, `npm run build`.
5. In Vercel/Netlify set the same two VITE variables, build with `npm run build`, output `dist`.
6. Add the deployed domain to Supabase Auth URL Configuration.

Never use a service-role key in frontend variables. The app now shows a setup screen instead of a white page if configuration is missing.
