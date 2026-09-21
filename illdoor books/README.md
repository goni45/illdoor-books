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

> **Upgrading an existing database?** Run the migrations in this order: [`schema-p0-upgrade.sql`](./schema-p0-upgrade.sql), [`schema-p1-debug-patch.sql`](./schema-p1-debug-patch.sql), then [`schema-p1-requests.sql`](./schema-p1-requests.sql). They are idempotent. Edit the admin email at the end of the P0 file before running it. The P1 patches include atomic checkout, campus-only PIN verification, dispute escrow freezes, profile privacy, institute transaction isolation, the `Inactive` listing state, and the corrected Book Requests trigger.

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

## Book Model + Seller Listing Refactor

For the existing Supabase database, run `schema-model-listing-migration.sql` after the three earlier patches. It renames the old listing-shaped `books` table to `seller_listings`, creates shared `books` models, groups test listings, migrates orders/wishlist/reviews, and installs the new RLS/RPC logic.

Migration order for the current database:

1. `schema-p0-upgrade.sql` (already applied)
2. `schema-p1-debug-patch.sql` (already applied)
3. `schema-p1-requests.sql` (already applied)
4. `schema-model-listing-migration.sql` (new)
5. `schema-model-listing-smoke-test.sql` (read-only verification)

The final `SELECT` in the migration returns the de-duplication report. Rows marked `needs_manual_review = true` were grouped by normalized title + department + semester because no exact subject code was available. Common covers use the earliest-created listing's first image; old seller image objects are intentionally left in Storage for later cleanup.


## BTEB Regulation 2022 catalog upgrade

The deploy-ready source now includes an additive curriculum upgrade for the five launch technologies.

Apply SQL in this order in Supabase SQL Editor:

1. Existing model/listing migrations and production fixes (already applied on migrated projects).
2. `schema-bteb-2022-01-STRUCTURE.sql`
3. `schema-bteb-2022-02-SEED-NO-STAGING.sql`
4. `schema-bteb-2022-curriculum-smoke-test.sql`
5. `schema-bteb-2022-final-verification.sql`

The older combined curriculum migration files are deprecated and must not be run.

Expected seed results:

- 258 curriculum mappings
- 153 unique subject-code Book Models in the source dataset
- 0 duplicate `(regulation, normalized subject_code)` models
- 0 orphan curriculum mappings

The curriculum migration is additive and idempotent. It does not recreate `seller_listings`, does not migrate orders again, and does not overwrite existing model titles or covers. Existing title conflicts are recorded in `book_curriculum_seed_conflicts` for admin review.

Catalog stock remains derived from same-institute `seller_listings` where `availability = 'Available'`. `Reserved`, `Sold`, and `Inactive` listings are excluded. Do not add or edit a manual stock column.

## Admin Book Model Manager

The Admin → Book Models tab can create and edit models together with a curriculum mapping, hide/activate models, and permanently delete only unused models. All writes use admin-only database functions.

For the latest source, use the publication-support patch documented below. It already includes the final Admin Book Model Manager functions. The `schema-admin-book-model-manager*` files are synchronized compatibility copies.

Permanent deletion is intentionally blocked when a seller listing or wishlist still references the model. Use **Hide** for models with marketplace history.


## Publication support: Haque and Technical

The marketplace supports exactly two publication labels:

- `Haque Publication`
- `Technical Publication`

Admins choose the model default publication, sellers choose the publication of their physical copy, and buyers see a publication badge on catalog cards, book details, seller offers, and checkout confirmation.

For an existing database, run only:

1. `schema-publication-support.sql`
2. `schema-publication-support-smoke-test.sql` (read-only verification)

This latest patch also includes the final Admin Book Model Manager functions, so it is safe to use even if the earlier admin-manager SQL was not applied.


## Publication-specific covers and metadata

Book Models now have two publication-edition slots in `book_publication_editions`: Haque Publication and Technical Publication. The Haque slot can be populated now; the Technical slot remains ready for a future source.

Run after `schema-publication-support.sql`:

1. `schema-publication-editions.sql`
2. `schema-publication-editions-smoke-test.sql`

The UI resolves covers in this order: selected seller publication cover → common model cover → Cover Coming Soon. Admins can maintain both publication sections from the Book Model editor.

A guarded manifest importer is included as `scripts/import-publication-manifest.mjs`. See `PUBLICATION_EDITION_ARCHITECTURE.md`. Website covers must not be copied to Supabase Storage until reuse permission has been confirmed.

## Personalized department feed and semester bundles

Apply `schema-personalized-feed-semester-bundles.sql` after the publication-edition migration.

Signed-in students now see only Book Models mapped to their profile department. Seller offers and full-semester bundles are restricted to the student's institute; admins retain workspace-wide visibility. Zero-offer models in the student's department remain visible as unavailable catalog entries.

The Sell flow supports:

- one individual seller listing; or
- one or more complete-semester sets published in a single batch.

Each selected semester becomes an independently purchasable full-set bundle. Individual books inside a bundle cannot be purchased directly; buyers may send the seller a single-book request. Bundle checkout uses `place_semester_bundle_order`, locks the bundle, and preserves the existing pickup PIN, escrow, cancellation, and completion lifecycle.

---

## Contact-first marketplace update (current model)

Illdoor now handles new activity as a **verified, same-institute contact marketplace**. A buyer selects a book offer or semester bundle and requests the seller's enabled contact method through the protected `open_seller_contact` RPC. Buyer and seller then arrange inspection, collection, and payment directly.

### Security and product rules

- New UI does not create an order, escrow payment, pickup PIN, automated refund, or bundle-order conversion.
- Raw phone/WhatsApp fields are not selectable through public profile access and are absent from all seller joins.
- Contact reveal requires authentication, a non-owner target, same normalized institute, an available target, seller opt-in, and a valid enabled method.
- Every reveal is logged and rate-limited. Concurrent requests are serialized; blocked interests cannot reveal again. Reserved, sold, and inactive items cannot reveal contact.
- Sellers receive an interest notification and manually manage `Available`, `Reserved`, `Sold`, and `Inactive` states. Active legacy orders remain locked.
- Meet in a public campus location, inspect before paying, never pay in advance, and never share OTP/PIN credentials. Illdoor does not guarantee direct payments.
- Historical orders, disputes, completion actions, and completed-order review authorization remain intact and are clearly labelled as legacy history.

### Deployment order

After the existing personalization and semester-bundle migrations, run:

1. `schema-contact-marketplace.sql`
2. `schema-contact-marketplace-smoke-test.sql`

Deploy the database migration before this frontend. The migration is additive and intentionally does not drop legacy order tables or RPCs.

---

## Browser URL Routing & SPA Navigation

Illdoor features client-side URL routing powered by `react-router-dom` with standard HTML5 browser history, back/forward navigation support, deep-linkable URLs, and dynamic search filter query parameters.

### Route Map

| Route | Page Component | Access / Protection | Purpose |
| --- | --- | --- | --- |
| `/` | `HomePage` | Public | Homepage, categories, popular books, and quick start |
| `/books` | `BrowsePage` | Public (Personalized) | Department catalog with bidirectional URL params (`?search=...&semester=...&subject=...&sort=...`) |
| `/books/:bookId` | `BookDetailsPage` | Public | Shared book model details, publication editions, and seller copies |
| `/bundles` | `SemesterBundlesPage` | Public (Personalized) | Complete-semester bundle sets |
| `/sell` | `SellBookPage` | Protected (Logged-in) | Sell individual books or publish full semester bundles |
| `/wishlist` | `WishlistPage` | Public / Context | Student book wishlist |
| `/requests` | `RequestsPage` | Public | Campus book request board |
| `/notifications` | `NotificationsPage` | Protected (Logged-in) | Notifications for contacts, orders, and system updates |
| `/profile` | `ProfilePage` | Protected (Logged-in) | User profile, verification status, and contact method preferences |
| `/orders` | `OrdersPage` | Public / Context | Legacy order history overview |
| `/orders/:orderId` | `OrdersPage` | Public / Context | Legacy order detail view |
| `/admin` | `AdminDashboard` | Admin Only (`is_admin`) | Admin console for catalog models, listings, disputes, and student verification |
| `*` | `NotFoundPage` | Public | Friendly 404 page with quick recovery links |

### Browser History & Deep Linking Behavior

- **Canonical Book Sharing:** Sharing a book generates `${origin}/books/${bookId}`. Direct visits navigate straight to the book details without losing state.
- **Legacy URL Redirection:** Existing links using `/?book=<id>`, `/?order=<id>`, or `/?view=<view>` are automatically intercepted and redirected to `/books/<id>`, `/orders/<id>`, or `/<view>` with history replacement.
- **Scroll Restoration:** Normal forward navigation and route transitions automatically scroll the window to the top. Navigating with browser Back / Forward (`POP`) maintains scroll position.
- **Protected Routes:** Accessing `/sell`, `/notifications`, or `/profile` while logged out prompts the inline authentication screen rather than a blank or broken state. The `/admin` console is guarded by `profiles.is_admin`.

### Hosting Rewrite Requirement (SPA Fallback)

Direct visits or page refreshes on nested routes like `/books/:bookId` or `/orders/:orderId` require the web server to rewrite all requests to `index.html`:

- **Vercel:** Configured via `vercel.json`:
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- **Netlify & Static Web Servers:** Configured via `public/_redirects`:
  ```text
  /* /index.html 200
  ```

### Contact-First Security Unchanged

- Sensitive state (seller phone numbers, WhatsApp numbers, OTPs, session secrets) is **never** included in browser URLs or history.
- The `ContactSellerModal` is rendered in-memory and is never a public route.
- Contact reveal calls the secured `open_seller_contact` RPC exclusively; no contact info is retrieved through public profile joins.

