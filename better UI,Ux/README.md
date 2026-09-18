# Illdoor — Polytechnic Used Book Marketplace

একই পলিটেকনিক ইনস্টিটিউটের ছাত্রছাত্রীদের মধ্যে ব্যবহৃত একাডেমিক বই কেনাবেচার জন্য একটি verified, campus-based marketplace — যেখানে digital ordering হয় এবং বই হ্যান্ডওভার হয় ক্যাম্পাস পিকআপ ডেস্কে ৪-ডিজিট PIN ভেরিফিকেশনের মাধ্যমে।

A student-to-student campus marketplace: one account can both **buy** and **sell**, payments are held in **escrow**, and physical handover happens at a **campus pickup desk** verified by a 4-digit PIN.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| UI | React 19 + TypeScript 7, Tailwind CSS 4, lucide-react, motion |
| Build | Vite 8 |
| Backend | Supabase (Auth, Postgres + Row Level Security, Storage, Realtime) |
| Image pipeline | `browser-image-compression` → WebP → Supabase Storage (`book-covers`) |

---

## Quick Start

**Prerequisites:** Node.js 20+

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
copy .env.example .env.local   # Windows
# cp .env.example .env.local   # macOS / Linux

# 3. Fill in the Supabase values inside .env.local
#    VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
#    VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
#    → Supabase Dashboard → Project Settings → API

# 4. Create the database (see "Database Setup" below)

# 5. Run the app
npm run dev        # http://localhost:3000
```

Available scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | TypeScript check (`tsc --noEmit`) |

---

## Database Setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New Query**, paste the entire contents of [`schema.sql`](./schema.sql) and run it. The script is idempotent, so it is safe to re-run.
3. In **Authentication → Sign In / Providers**, make sure **Email** is enabled.
4. Optional for local testing: turn **Confirm email** off (Auth → Email) so new accounts can log in immediately without clicking a confirmation link.

> **Upgrading an existing database?** If your Supabase project was created before the P0 update (admin roles, reviews, student verification, cancel flow), run [`schema-p0-upgrade.sql`](./schema-p0-upgrade.sql) instead. It contains only the new pieces, every statement is idempotent, and it ends with the statement that grants staff access to your account (edit the email there first).

`schema.sql` creates and configures:

- **Tables** — `profiles`, `pickup_points`, `books`, `book_images`, `orders`, `wishlist`, `notifications`, `disputes`, `reviews`, `verification_requests`
- **Row Level Security** — listings and reviews are publicly readable; students may only insert/update/delete their *own* books, orders, wishlist rows, notifications and disputes; pickup booths are read-only reference data
- **Signup trigger** (`handle_new_user`) — auto-creates the `profiles` row from the signup metadata
- **Order lifecycle trigger** (`handle_order_lifecycle`) — notifies both participants; on completion it releases escrow, marks the book `Sold` and increments `total_sales` / `total_purchases`; on cancellation it refunds escrow, frees the listing and notifies both sides
- **Order status guard** (`guard_order_transition`) — an order can only move forward (`placed → confirmed → dropped_off → ready_for_pickup → picked_up → completed`), so a client cannot jump straight to `completed`
- **Review triggers** — a review is accepted only for a completed order from one of its two participants, and `profiles.rating` is recomputed as the average of all received ratings
- **Verification trigger** (`handle_verification_decision`) — only an admin decision can set `profiles.is_verified`, and the student is notified on approval/rejection
- **Storage buckets** — `book-covers` (public read, authenticated write, owner-only delete) and `student-ids` (private: owner + admin read only)
- **Realtime** — publishes `books`, `book_images`, `orders`, `notifications`, `reviews` and `verification_requests` to `supabase_realtime`
- **Seed data** — the three campus pickup points

> The client subscribes to that realtime publication, so new listings, order status changes, reviews, verification decisions and notifications appear live for every signed-in student without a page refresh.

---

## Roles, Reviews & Verification

**Campus desk admin (staff) access**

The Operations Console (`Pages → Ops Console`) is gated on the `profiles.is_admin` flag. Nothing in the client can set that flag, so grant it by hand in the SQL editor after the staff account has signed up once (this statement is also included at the end of [`schema-p0-upgrade.sql`](./schema-p0-upgrade.sql)):

```sql
UPDATE public.profiles SET is_admin = TRUE
WHERE email = 'admin@yourdomain.com';
```

Admins, and only admins, can: moderate any listing, see every order and dispute, resolve disputes, and approve/reject student ID verifications. Everyone else sees a "Campus Desk Access Only" screen if they reach that view.

**Reviews (trust score)**

- A review form appears on an order **only after** the pickup PIN has been verified (`status = completed`).
- The DB trigger validates that the reviewer is a participant and derives the counterparty itself, then recomputes `profiles.rating` as the average of received ratings.
- Reviews carry a *Transaction Verified* badge and appear on the profile that received them.

**Student ID verification**

1. The student opens `Profile → Verify Student ID`, enters their BTEB roll + registration number and attaches an ID card photo.
2. The photo is compressed client-side and stored in the **private** `student-ids` bucket (`userId/…`). Only the owner and admins can read it; admins view it through a short-lived signed URL.
3. The request lands in `Ops Console → Student Verification`, where an admin approves or rejects it (with an optional note).
4. Approval is what flips `is_verified` — the badge is never self-granted by the client.

**Cancelling an order**

Either participant can cancel while the order is `placed` or `confirmed`. The DB trigger then refunds the escrow (`payment_state → Refunded`), returns the listing to `Available`, and notifies both students.

---

## Project Structure

```
src/
├── App.tsx                     # Auth gate + view router + on-demand auth modal
├── types.ts                    # Shared domain types (BookListing, Order, StudentUser, …)
├── hooks/useAuth.ts            # Supabase session, profile fetch, signIn/signUp/reset
├── lib/supabase.ts             # Supabase client + typed Database schema
├── lib/imageUpload.ts          # Compression + Storage upload helpers
├── context/MarketplaceContext  # Books, orders, wishlist, notifications, disputes + realtime
├── data/mockData.ts            # Fallback listings and form option lists
├── components/                 # Navbar, BookCard, FilterPanel, OrderTimeline, …
│   └── common/                 # Button, badges, avatar, logo, BottomGlassNav, …
└── pages/                      # Home, Browse, BookDetails, SellBook, Orders, Wishlist,
                                # Notifications, Profile, AdminDashboard, AuthPage
```

### Auth model

- Guests can browse listings, but Buy / Sell / Wishlist / Profile actions open the `AuthPage` modal with a contextual message.
- `MarketplaceProvider` exposes `user`, `isAuthenticated`, `openAuthModal(tab, message)` and `signOut()`.
- Registration collects full name, student roll, institute, technology/department, semester, phone, email and password; the DB trigger copies these into `profiles`.

### Data behaviour

- If the `books` table is empty (fresh project), the UI falls back to curated sample listings so the interface never renders empty during setup.
- Wishlist items saved while signed out are stored locally and merged into the database on the next sign-in.
- Pickup points load from `pickup_points`, falling back to the bundled seed list if the query fails.
- Order stats (`total_sales` / `total_purchases`) are owned by the DB trigger, never written directly by the client.

---

## Deployment

Set the environment variables in the hosting provider (production does **not** read `.env.local`):

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

SPA refresh fallback is already configured, so refreshing the page or opening a deep link never returns 404:

| Host | Config file |
| --- | --- |
| Vercel | [`vercel.json`](./vercel.json) — build + rewrite to `/index.html` |
| Netlify | [`netlify.toml`](./netlify.toml) + [`public/_redirects`](./public/_redirects) |
| Any static host / Cloud Run | deploy `dist/` and keep the `_redirects` file |

- **Vercel:** import the repository — framework, build command and output directory come from `vercel.json`.
- **Netlify:** import the repository — build command `npm run build`, publish directory `dist`.
- **Supabase Auth URLs:** add the deployed domain to Authentication → URL Configuration (Site URL + Redirect URLs) so confirmation and password-reset links resolve correctly.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Missing Supabase environment variables` | `.env.local` is missing or unpopulated; restart `npm run dev` after editing |
| New signup cannot log in | Email confirmation is enabled — confirm via the email link, or disable it while testing |
| Writes silently fail / data does not persist | `schema.sql` was not run, so tables or RLS policies are missing |
| Live updates never arrive | Re-run the realtime section of `schema.sql` and check Database → Replication → `supabase_realtime` |
| Book image upload fails | The `book-covers` bucket or its storage policies are missing (re-run the storage section of `schema.sql`) |

---

<sub>Originally scaffolded in Google AI Studio; the UI, data layer and Supabase integration have since been extended locally.</sub>
