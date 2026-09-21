# Illdoor Update Report

> **Report date:** 19 September 2026  
> **Scope:** Book Model + Seller Listing refactor, bug hardening, and deployment readiness

## 1. Why the plan changed

The original product plan treated each seller's submission as a separate `books` row. That caused duplicate search results, duplicated metadata/images, ambiguous wishlist behavior, and orders that referenced a generic “book” instead of an explicitly selected physical copy.

The approved architecture now separates:

```text
Book Model (shared academic metadata)
        -> Seller Listings (physical copies/offers)
        -> Orders (one selected seller listing)
```

The new `PRD.md` is the authoritative context for future contributors.

---

## 2. Architecture changes

### Before

- Every seller created a full independent book row.
- Title, author, subject code, department, semester, condition, price, seller, and images were mixed together.
- The same academic book appeared multiple times in search.
- Order and review references were listing-shaped `book_id` values.
- Wishlist saved an individual seller row.

### After

- `books` stores one shared Book Model.
- `seller_listings` stores a seller's physical copy, condition, price, and pickup point.
- Search/Home/Browse show one model card.
- Cards show `From ৳X` and available seller count.
- Details show one common cover plus independent seller offers.
- Orders use `seller_listing_id`.
- Reviews use `seller_listing_id` and remain transaction-backed.
- Wishlist uses model-level `book_id`.
- Requests use `fulfilled_by_listing_id`.
- Admin manages Book Models and Seller Listings separately.

---

## 3. Migration and de-duplication

The migration strategy:

1. Renames the old listing-shaped `books` table to `seller_listings`.
2. Creates the new common `books` table.
3. Groups old listings by normalized subject code.
4. Falls back to normalized title + department + semester when subject code is unavailable.
5. Uses the earliest-created listing's first image as the common cover.
6. Backfills `seller_listings.book_id`.
7. Renames order, review, request, and wishlist references.
8. Produces `book_model_migration_report` for review.
9. Keeps old storage objects; physical cleanup is deferred.

The PostgreSQL function-name conflict was fixed by dropping the old `place_order(TEXT, TEXT)` signature before recreating it with `p_seller_listing_id`.

Migration execution already reported success, and the earlier smoke check returned:

```text
models_without_listings = 0
```

---

## 4. Frontend changes

Updated marketplace behavior includes:

- Model-level marketplace data fetching
- Nested seller offer fetching
- Institute-visible seller offer filtering
- Model details with separate offer cards
- Seller-specific checkout
- Model-first Sell flow
- Model-level wishlist
- Owned listing management in Profile
- Separate admin model/listing management
- Notifications linking to model details
- Seller count and lowest-price displays
- Updated order mapping through Seller Listing -> Book Model

Important mapping corrections:

- Orders: `seller_listing_id`
- Reviews: `seller_listing_id`
- Requests: `fulfilled_by_listing_id`
- Wishlist: model `book_id`

---

## 5. White-screen root cause and fix

### Root cause

The supplied project did not contain `.env.local`. `src/lib/supabase.ts` attempted to initialize Supabase with empty URL/key values, throwing before React could render. The existing `dist` bundle had also been generated without a Supabase URL.

### Fix

- Validate `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before data access.
- Use a harmless local placeholder only to prevent module-import crashes.
- Render a visible Supabase setup screen when configuration is missing.
- Add a React Error Boundary for unexpected render/runtime errors.

Result: missing environment configuration no longer produces a silent white screen.

---

## 6. Database hardening

The production hardening patch adds or updates:

- Positive original/selling price validation
- Selling price cannot exceed original price
- Maximum condition-note length
- Valid condition enforcement
- Active pickup-point validation
- Protected availability-change RPC
- Direct authenticated insert/update restrictions on Seller Listings
- Reserved/Sold listing transition protection
- Completed-order lifecycle updates
- Cancellation/refund lifecycle updates
- Buyer and seller completion/cancellation notifications
- Dispute function migrated from `orders.book_id` to `orders.seller_listing_id`
- Metadata conflict flags in migration report

Server-side rules remain the authority; frontend button restrictions are not treated as security.

---

## 7. Preserved systems

The refactor was designed to preserve:

- Supabase authentication
- Profiles and institute membership
- Student verification
- Orders and escrow state
- Pickup points and PIN verification
- Notifications
- Wishlist
- Transaction reviews
- Book requests
- Reports and disputes
- Admin operations
- Storage objects
- Vercel/Netlify SPA deployment configuration

---

## 8. Deployment changes

Deployment readiness updates include:

- Required Node version: `>=20.19.0`
- Portable clean script
- `.env.example` limited to the two required public Supabase values
- Vercel and Netlify SPA fallback configuration
- Environment setup instructions
- `node_modules`, `dist`, and private `.env.local` excluded from the handoff package
- Production SQL follow-up and read-only smoke-test files

Required frontend variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

A service-role key, database password, or JWT secret must never be placed in frontend environment variables.

---

## 9. Verification performed

Completed checks during the implementation passes:

- TypeScript `tsc --noEmit` passed repeatedly.
- Final source lint/type check passed.
- Production bundle completed in missing-environment mode.
- Browser test confirmed the setup screen rendered with a non-empty React root.
- Production bundle completed in configured-environment mode.
- Browser test confirmed the application Home UI rendered with a non-empty React root.
- No uncaught JavaScript `TypeError`, `ReferenceError`, or `SyntaxError` was detected in the configured startup test.
- Static checks confirmed updated listing identifiers and protected availability RPC usage.
- Secret scan passed.
- Deliverable archive integrity check passed.

---

## 10. Environment limitation

The sandbox could not reach the live Supabase host because external DNS/network access was blocked. Therefore:

- Live REST queries were attempted but could not be completed from the sandbox.
- The user's successful migration and smoke-test results provide the available database evidence.
- The new production SQL patch must still be executed in Supabase SQL Editor and followed by its read-only smoke test.

This limitation is infrastructure-related, not a request for more credentials. No additional secret should be shared.

---

## 11. Required SQL sequence

For the already-migrated project:

```text
1. schema-model-listing-production-fixes.sql
2. schema-model-listing-production-smoke-test.sql
```

The smoke test should show zero failures for orphan records, invalid prices, missing listing references, and lifecycle mismatches. Rows marked `needs_manual_review` must be reviewed by an admin rather than automatically merged.

---

## 12. Acceptance scenario

Use this scenario for final end-to-end verification:

```text
Book Model: Engineering Mathematics-1
Seller A: ৳400, Good, Some writing
Seller B: ৳450, Like New, No writing
Seller C: ৳350, Used, Highlighting present
```

Expected:

1. Search returns one model.
2. Card shows `From ৳350` and `3 sellers`.
3. Details show one common cover and three offers.
4. Buying Seller B creates an order for Seller B's listing only.
5. Seller B becomes Reserved.
6. Seller A and Seller C remain Available.
7. Buyer and Seller B receive order notifications.
8. Cancellation restores only Seller B, or successful PIN completion marks only Seller B Sold.
9. Completed order enables transaction review.

---

## 13. Deferred items

Not blocking the current release:

- Cleanup of old seller image objects
- Advanced fuzzy de-duplication beyond normalized matching/manual review
- Live payment gateway and payout provider
- Seller-specific condition photo gallery
- Email/SMS notifications
- Legacy route compatibility for the previously undeployed site

---

## 14. Documentation rule going forward

Any approved change to the following must update `PRD.md` in the same work item:

- Database ownership/relationships
- Sell or checkout flow
- Listing/order lifecycle
- Institute visibility
- RLS/security policy
- Admin responsibilities
- Deployment requirements

This prevents future developers or agents from implementing against the superseded one-row-per-seller architecture.


## 20 September 2026 — BTEB Curriculum Catalog Implementation

Implemented the additive Regulation 2022 catalog layer on top of the existing Book Model + Seller Listing architecture. Added `curriculum_entries`, 258 curriculum mappings, 153 unique subject-code models, idempotent conflict-safe seed SQL, institute-scoped listing visibility, derived stock, smart seller selectors, empty-catalog states, and curriculum-aware filters. See `BTEB_IMPLEMENTATION_REPORT.md` and run the new curriculum migration plus smoke test before deployment.
