# Illdoor — Updated Project Report

> **Project:** Polytechnic Used Book Marketplace  
> **Report version:** 2.0  
> **Updated:** 19 September 2026  
> **Status:** Model/Listing refactor implemented; final Supabase production patch and live E2E verification pending

## 1. Executive summary

Illdoor হলো পলিটেকনিক শিক্ষার্থীদের জন্য institute-based used academic book marketplace। একজন user একই account দিয়ে বই কিনতে, নিজের physical copy বিক্রি করতে, order track করতে, campus pickup সম্পন্ন করতে, review দিতে এবং request/dispute manage করতে পারে।

Project-এর সবচেয়ে বড় architecture update হলো:

```text
আগে:
প্রতিটি seller copy = আলাদা books row

এখন:
Book Model (shared metadata)
    -> Seller Listings (physical copies/offers)
    -> Order (one specific seller listing)
```

এই পরিবর্তনের ফলে একই academic book search-এ একবার দেখায়, buyer এক page থেকে একাধিক seller offer compare করতে পারে এবং checkout নির্দিষ্ট seller-এর নির্দিষ্ট physical copy reserve করে।

`PRD.md` এখন product behavior-এর authoritative source। এই report implementation status ও verification history ব্যাখ্যা করে।

---

## 2. Current technology stack

```text
Frontend: React 19 + TypeScript
Build tool: Vite 8
Styling: Tailwind CSS
Icons: Lucide React
Backend: Supabase
Database: PostgreSQL
Authentication: Supabase Auth
Storage: Supabase Storage
Realtime: Supabase Realtime
Deployment: Vercel / Netlify
Required Node.js: >= 20.19
```

পুরোনো document-এর Next.js বা local-only dummy architecture আর current implementation বোঝায় না। বর্তমান source React/Vite এবং Supabase-connected।

---

## 3. Branding and navigation

### Completed

- Custom Illdoor animated logo
- Orange brand gradient and door animation
- Responsive brand sizing
- Desktop floating navigation
- Mobile navigation/dropdown
- Bottom frosted-glass quick navigation
- Home, Browse, Requests, Orders, Wishlist, Notifications, Sell, Profile এবং Admin navigation
- Auth-aware profile/login actions

---

## 4. Authentication and student profiles

পুরোনো report-এ Authentication missing বলা হয়েছিল; এটি এখন outdated।

### Implemented

- Supabase email/password authentication
- Login and registration UI
- Auth modal/flow for protected actions
- Persistent session
- Current-user profile loading
- Institute, department, semester এবং roll information
- Avatar and public seller identity
- Password-reset-ready Supabase configuration
- Student verification request flow
- Student ID upload path
- Admin verification queue
- Verified-student state
- Admin flag from database profile

### Privacy/security behavior

- Signed-in user নিজের complete profile protected RPC দিয়ে load করে।
- Public seller joins শুধুমাত্র marketplace-safe profile fields expose করে।
- Private profile data public browse query-তে expose করার কথা নয়।

---

## 5. Updated database architecture

### 5.1 `books` — shared Book Models

Common academic information:

```text
id
title
author
edition
subject_code
subject_name
department
semester
isbn
common_image_url
status
views_count
created_at
updated_at
```

### 5.2 `seller_listings` — seller physical copies

Offer-specific information:

```text
id
book_id
seller_id
condition
condition_details
original_price
selling_price
availability
pickup_point_id
pickup_point_name
created_at
updated_at
```

### 5.3 Updated relationships

```text
books.id -> seller_listings.book_id
profiles.id -> seller_listings.seller_id
seller_listings.id -> orders.seller_listing_id
seller_listings.id -> reviews.seller_listing_id
books.id -> wishlist.book_id
seller_listings.id -> book_requests.fulfilled_by_listing_id
```

### Core rule

```text
Order -> Seller Listing -> Seller + Book Model
```

Order generic model নয়; selected physical copy reference করে।

---

## 6. Data migration and de-duplication

### Implemented migration behavior

- পুরোনো listing-shaped `books` table `seller_listings`-এ migrate/rename করা হয়েছে।
- নতুন shared `books` model table তৈরি হয়েছে।
- Existing seller rows preserved হয়েছে।
- Orders, reviews, wishlist এবং requests-এর references migrate করা হয়েছে।
- `seller_listings.book_id` backfill হয়েছে।
- `book_model_migration_report` তৈরি হয়েছে।
- Old storage objects delete করা হয়নি।

### Grouping rules

1. Exact normalized `subject_code`
2. Subject code না থাকলে normalized `title + department + semester`
3. Uncertain/conflicting groups manual review

### Common cover rule

একটি model group-এর earliest-created listing-এর first image common cover হিসেবে নেওয়া হয়েছে।

### Confirmed migration evidence

User-এর Supabase SQL execution:

```text
schema-model-listing-migration-FIXED.sql
Success. No rows returned
```

Earlier smoke result:

```text
models_without_listings = 0
```

PostgreSQL function parameter conflict fixed হয়েছিল:

```sql
DROP FUNCTION IF EXISTS public.place_order(TEXT, TEXT);
```

এরপর `place_order` নতুন `p_seller_listing_id` input দিয়ে recreate করা হয়েছে।

---

## 7. Homepage and marketplace browsing

### Implemented

- Interactive hero/search experience
- Department and semester discovery
- Book-model-level cards
- One card per academic model
- `From ৳X` lowest-price display
- Available seller count
- Subject code, department এবং semester display
- Wishlist action
- Featured/recent model sections
- Trust, campus pickup এবং escrow-related information

### Filtering/search

- Title
- Author
- Subject name/code
- Department
- Semester
- Condition across available offers
- Price range across available offers
- Availability
- Recommended/newest/price sorting

### Institute behavior

Available offers current institute অনুযায়ী filter হয়। Price, seller count, selected seller, condition এবং pickup summary institute-filtered offer set থেকে calculate করার জন্য data mapping update করা হয়েছে।

---

## 8. Book details and seller offers

Book details page এখন দুই ভাগে বিভক্ত।

### Common model information

- Admin-managed common cover
- Title
- Author
- Edition
- Subject code
- Department
- Semester
- Starting price
- Available seller count

### Individual seller offer cards

- Seller name/avatar
- Verification
- Seller rating
- Physical condition
- Condition notes
- Original and selling price
- Pickup point
- `Buy this copy` action

Buyer নির্দিষ্ট offer select করে checkout করে। নিজের listing কেনার action disabled।

---

## 9. Sell Book flow

পুরোনো form-এ seller title, academic metadata এবং একাধিক image দিত। Updated flow model-first।

```text
Sell Now
 -> Search existing model
 -> Select model
 -> Condition নির্বাচন
 -> Copy-specific notes
 -> Original/selling price
 -> Pickup point
 -> Publish seller offer
```

### Implemented behavior

- Existing model selection
- Seller-specific condition and notes
- Price and pickup input
- Common cover/model metadata reuse
- `create_seller_listing` RPC
- Seller-owned listing management
- Available/Inactive switching
- Reserved/Sold transition protection plan

Model না পাওয়া গেলে controlled request/admin review workflow ব্যবহার করতে হবে।

---

## 10. Orders and checkout

### Implemented

- Specific seller offer checkout
- `orders.seller_listing_id`
- Buyer/seller/order joins through listing and model
- Same-institute validation in database order function
- Own-listing purchase prevention
- Listing row locking during checkout
- Listing `Available -> Reserved`
- Order number
- Pickup verification PIN
- Escrow-style payment state
- Purchases and sales views
- Order timeline
- Eligible cancellation

### Order states

```text
placed
confirmed
dropped_off
ready_for_pickup
picked_up
completed
cancelled
disputed
```

### Listing states

```text
Available
Reserved
Sold
Inactive
```

### Completion/cancellation behavior

- Completed order marks selected listing Sold.
- Buyer/seller counters update once.
- Escrow becomes Released to Seller.
- Cancellation refunds eligible escrow.
- Cancellation restores only the selected listing to Available.

---

## 11. Campus pickup and verification

### Implemented

- Database-backed pickup points
- Order-specific pickup location
- Verification PIN
- Admin/campus desk verification RPC
- Invalid PIN response
- Completed-order replay protection
- Listing/order lifecycle update after successful verification

Only an authorized admin/campus desk account should complete PIN verification.

---

## 12. Wishlist

Wishlist seller-row-level থেকে model-level হয়েছে।

```text
wishlist.user_id
wishlist.book_id -> books.id
UNIQUE(user_id, book_id)
```

### Implemented

- Guest/local wishlist behavior
- Signed-in wishlist persistence
- Guest-to-account merge
- Wishlist page
- One saved record per user/model

---

## 13. Reviews and reputation

### Implemented

- Reviews tied to completed orders
- `reviews.seller_listing_id`
- Buyer/seller counterparty review
- Server-side review validation trigger
- Duplicate-review handling
- Verified transaction context
- Ratings and transaction counters in profile/admin UI

Client mapping এখন old `book_id` নয়, migrated listing identifier ব্যবহার করে।

---

## 14. Book requests

### Implemented

- Request creation
- Subject code, department, semester এবং budget
- Open/fulfilled/cancelled states
- Matching-listing notification trigger
- Requester public profile data
- `fulfilled_by_listing_id`
- Request-to-sell context/prefill architecture

Same subject code-এর নতুন seller offer তৈরি হলে matching open requesters notification পেতে পারে।

---

## 15. Notifications

### Implemented categories

- Order events
- Pickup events
- Verification
- System/request match
- Dispute

### Implemented actions

- Notification center
- Unread counter
- Mark one read
- Mark all read
- Link route/link ID navigation
- Model-details navigation for matching book/listing events

Production acceptance test-এ buyer ও seller উভয়ের new-order, cancellation, completion এবং pickup notification verify করতে হবে।

---

## 16. Reports and disputes

### Implemented

- Listing/order reports
- Order participant dispute RPC
- Dispute states
- Admin dispute queue
- Admin resolution flow
- Order freeze to `disputed`

### Migration correction

পুরোনো dispute function `orders.book_id` ব্যবহার করত। Production hardening patch relationship update করে:

```text
orders.seller_listing_id
 -> seller_listings.book_id
 -> books.title
```

---

## 17. Admin dashboard

### Available management areas

- Overview/dashboard statistics
- Users and verification
- Book Models
- Seller Listings
- Orders
- Pickup/PIN workflow
- Reviews
- Book Requests
- Reports/disputes

### Book Model controls

- Create model
- View common metadata
- Replace common cover URL
- Hide/restore model
- View offer count and lowest price

### Seller Listing controls

- View seller and copy details
- View availability
- Moderate eligible listings
- Navigate to related model

Admin architecture এখন common academic model এবং individual seller copy আলাদাভাবে manage করে।

---

## 18. Image and storage strategy

### Current architecture

- `book-covers` Supabase bucket support
- Compression utility
- Student ID upload support
- Signed/private verification image access
- Model-first marketplace-এ one admin-managed common cover
- Seller-এর repeated cover upload required নয়

### Deferred

- পুরোনো seller images-এর storage cleanup
- Seller-specific condition-photo gallery

Existing storage objects migration-এর সময় preserve করা হয়েছে।

---

## 19. RLS and security

### Implemented/defined controls

- Supabase Row Level Security
- Admin-only Book Model writes
- Seller-owned listing policies
- Model-level wishlist ownership
- Participant-scoped order reads/updates
- Protected profile access
- Storage folder ownership
- Admin-only migration report access
- Security-definer RPCs with controlled `search_path`
- Server-side review and checkout validation

### Production hardening patch

`schema-model-listing-production-fixes.sql` includes:

- Positive price checks
- Selling price cannot exceed original price
- Condition/note validation
- Direct listing insert/update restrictions
- Secured listing availability RPC
- Reserved/Sold manual transition protection
- Order completion/cancellation lifecycle handling
- Lifecycle notifications
- Migrated dispute function
- Metadata conflict flags

Frontend-এ কখনো ব্যবহার করা যাবে না:

```text
service_role key
database password
JWT secret
```

Frontend variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

## 20. White-screen investigation and fix

### Confirmed root cause

Uploaded project-এ `.env.local` ছিল না। `createClient('', '')` React render-এর আগে exception throw করছিল। Existing `dist` bundle-এও Supabase URL ছিল না। Browser DOM test-এ React root empty পাওয়া গিয়েছিল।

### Implemented protection

- Supabase environment validation
- Missing configuration setup screen
- Safe import fallback
- React Error Boundary
- Visible runtime error recovery UI

Missing environment variables এখন silent white screen-এর পরিবর্তে setup instructions দেখায়।

---

## 21. Deployment readiness

### Configuration files

- `vercel.json`
- `netlify.toml`
- `public/_redirects`
- `.env.example`

### Commands

```powershell
npm ci
npm run lint
npm run build
npm run dev
```

### Requirements

```text
Node.js >= 20.19
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

### Packaging rule

Deployable handoff থেকে বাদ রাখতে হবে:

```text
node_modules
dist from an old environment
.env.local
OS-specific native binaries
```

Vercel/Netlify clean install target OS-এর correct optional native dependencies install করবে।

---

## 22. Verification completed

### Passed

- `npm run lint` / `tsc --noEmit` multiple times
- Final TypeScript verification
- Static model/listing identifier checks
- Configuration-guard checks
- Error-boundary check
- Missing-env production bundle test
- Configured-env production bundle test
- Missing-env Chromium render: non-empty React root and setup screen
- Configured Chromium render: Home UI rendered
- No detected uncaught `TypeError`, `ReferenceError`, or `SyntaxError` during configured startup test
- Secret scan
- ZIP integrity verification

### Database evidence

- Fixed model/listing migration executed successfully
- Earlier smoke result: `models_without_listings = 0`

---

## 23. Verification limitations

Sandbox external DNS/network block-এর কারণে live Supabase REST endpoints verify করা যায়নি। এটি credential error নয়।

Sandbox থেকে verify করা যায়নি:

- Live authenticated checkout
- Live buyer/seller notifications
- Live cancellation and PIN flow
- Live RLS attack scenarios
- Real browser interaction against a deployed preview

এগুলো verify করতে production SQL patch apply করার পরে public Vercel/Netlify preview এবং temporary buyer/seller/admin accounts ব্যবহার করতে হবে।

কোনো additional Supabase secret প্রয়োজন নেই।

---

## 24. Remaining steps before production release

### Required

1. Supabase SQL Editor-এ `schema-model-listing-production-fixes.sql` run করা।
2. `schema-model-listing-production-smoke-test.sql` run করা।
3. Failure counts `0` কিনা নিশ্চিত করা।
4. `migration_rows_needing_review` rows admin দিয়ে review করা।
5. Vercel/Netlify-এ দুইটি public VITE environment variable set করা।
6. Clean dependency install এবং production build করা।
7. Supabase Auth URL Configuration-এ deployed domain যোগ করা।
8. Temporary buyer, seller এবং admin account দিয়ে full E2E acceptance test করা।

### Recommended E2E scenario

```text
Book Model: Engineering Mathematics-1
Seller A: ৳400, Good, Some writing
Seller B: ৳450, Like New, No writing
Seller C: ৳350, Used, Highlighting present
```

Expected:

- Search returns one model.
- Card shows `From ৳350` and `3 sellers`.
- Details show one common cover and three offers.
- Buying Seller B reserves only Seller B.
- Seller A/C remain Available.
- Buyer/Seller B receive relevant notifications.
- Cancellation restores only Seller B, অথবা PIN completion marks only Seller B Sold.
- Completed order permits review.

---

## 25. Known deferred work

- Old storage-object cleanup
- Advanced fuzzy de-duplication
- Live bKash/Nagad gateway
- Production seller payouts
- Seller-specific condition images
- Email/SMS notifications
- Advanced fraud/no-show scoring
- Multi-institute scale testing
- Legacy route compatibility for the previously undeployed site

---

## 26. Documentation status

Current documentation responsibilities:

- `PRD.md`: কী বানাতে হবে, product rules এবং acceptance criteria
- `README.md`: project setup, migrations, run, build এবং deployment commands
- `project_report.md`: এখন পর্যন্ত কী implement হয়েছে, verification এবং remaining work
- `UPDATE_REPORT.md`: model/listing refactor ও bug-fix change summary
- `DEPLOYMENT_READY.md`: final release checklist

Future architecture change হলে একই work item-এ `PRD.md` এবং `project_report.md` update করতে হবে।

---

## 27. Current project status

```text
Branding/UI                     Complete
Authentication                 Implemented
Supabase integration           Implemented
Book Model architecture        Implemented
Seller Listing architecture    Implemented
Migration                      Successfully applied
Browse/details/sell refactor   Implemented
Specific-listing checkout      Implemented
Wishlist migration             Implemented
Reviews/requests migration     Implemented
Admin separation               Implemented
White-screen protection        Implemented
Type/static verification       Passed
Production hardening SQL       Prepared; must be applied
Live Supabase E2E              Pending
Public deployment              Pending
```

Project source এখন deployment-ready structure-এ আছে, কিন্তু production release complete বলতে হলে final SQL patch, live smoke test, environment configuration এবং deployed E2E test শেষ করতে হবে।
