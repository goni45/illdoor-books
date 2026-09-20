# Book Model + Seller Listing Refactor

## Implemented

- Split the marketplace concept into shared `books` models and physical `seller_listings`.
- Added an idempotent migration with deterministic de-duplication reporting.
- Exact normalized subject code is the primary grouping key; normalized title + department + semester is the fallback and is flagged for manual review.
- Chose the earliest-created listing's first image as the common model cover.
- Updated browsing to return one model with `From ৳…` and seller counts.
- Updated the details page to show common metadata and separate seller offer cards.
- Updated checkout to purchase a specific `seller_listing`.
- Updated Sell Now to select an existing model and only enter physical-copy fields.
- Updated wishlist semantics to save book models.
- Added Book Models and Seller Listings separation in the admin panel.
- Preserved authentication, profiles, verification, orders, pickup, disputes, reviews, notifications, requests, realtime, and deployment configuration.

## Database migration

Run `schema-model-listing-migration.sql` once after the previous three patches. The script:

1. Renames the old listing-shaped `books` table to `seller_listings`.
2. Creates the new shared `books` model table.
3. Creates and populates `book_model_migration_report`.
4. Links every seller listing to one model.
5. Renames order/review/request references to listing semantics.
6. Migrates wishlist rows from listings to models.
7. Installs RLS, indexes, realtime, model/listing RPCs, lifecycle functions, matching notifications, and admin-only pickup verification.

Old per-listing storage objects are not deleted. They can be cleaned up after the common covers are reviewed.

## Verification performed

- `npm run lint` / `tsc --noEmit`: passed.
- Migration and frontend references were statically reviewed.
- `schema-model-listing-smoke-test.sql` was added for read-only database verification after migration.
- Production build was attempted, but the uploaded Windows `node_modules` lacks the Linux Rolldown native binding. A clean local `npm install`/`npm ci` on the target computer is still required before `npm run build`.
- Live Supabase integration and browser tests were not run because the sandbox has no project credentials.

## Required manual test scenario

Create or identify the model `Engineering Mathematics-1`, then create three offers:

- Seller A — ৳400 — Good — Some writing
- Seller B — ৳450 — Like New — No writing
- Seller C — ৳350 — Used — Highlighting present

Verify search returns one model, details shows one common cover and three offers, buying Seller B creates an order for Seller B's listing, only Seller B becomes Reserved/Sold, and Seller A/C remain Available.

## Rollback

This project is not live and contains test data. The simplest rollback is to restore the previous database/schema and re-seed dummy data. Do not run the legacy schema files again after the model/listing migration without resetting the test database, because their old functions target the pre-refactor table meanings.
