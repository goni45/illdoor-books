# ILLDOOR — Final Update Report

**Date:** 20 September 2026  
**Scope:** BTEB Regulation 2022 default catalog, curriculum mapping, derived stock, and seller-listing integration

## 1. Final Status

The BTEB default catalog database upgrade has been applied and successfully verified in Supabase.

Final verification result:

| Check | Result | Status |
|---|---:|---|
| Curriculum mappings | 258 | Passed |
| Duplicate Book Models | 0 | Passed |
| Orphan curriculum mappings | 0 | Passed |
| Title conflicts | 0 | Passed |

The database curriculum setup is complete.

## 2. Implemented Architecture

The existing Book Model + Seller Listing architecture was preserved:

```text
books = shared academic Book Models
curriculum_entries = department/semester membership
seller_listings = physical copies offered by sellers
orders.seller_listing_id = selected physical copy
wishlist.book_id = model-level bookmark
reviews.seller_listing_id = transaction listing
book_requests.fulfilled_by_listing_id = fulfilling seller offer
```

A shared subject code creates one Book Model and can have multiple `curriculum_entries` rows. This prevents duplicate models while allowing the same subject to appear in different departments or semesters.

## 3. Curriculum Dataset

BTEB Regulation 2022 data was added for the five launch technologies:

| Technology | Code | Mappings |
|---|---:|---:|
| Computer Science & Technology | 85 | 52 |
| Civil Technology | 64 | 54 |
| Electrical Technology | 67 | 49 |
| Mechanical Technology | 70 | 51 |
| Electronics Technology | 68 | 52 |
| **Total** |  | **258** |

The dataset represents **153 unique subject-code Book Models**.

## 4. Stock and Availability Rules

Stock is not stored as a manually editable value.

```text
available_stock = count(seller_listings where availability = 'Available')
```

For regular users, visible stock is limited to offers from the same institute.

| Listing status | Counts as available stock |
|---|---:|
| Available | Yes |
| Reserved | No |
| Sold | No |
| Inactive | No |

Catalog behavior:

```text
Stock 0 -> Unavailable / No seller offer yet / Sell this book
Stock > 0 -> Available / Stock N / M sellers / From ৳X
```

Physical stock and seller count are separate values because one seller may list more than one physical copy.

## 5. Application Changes

The updated project source includes:

- Curriculum-aware Book Model loading
- Department and semester filtering through `curriculum_entries`
- Default catalog models visible with zero offers
- Explicit `Unavailable`, `Stock 0`, and `Sell this book` states
- Department → Semester → Subject selector in the Sell flow
- Subject code supplied by the catalog and not entered manually
- Model preselection from catalog and details pages
- Multiple seller offers on the Book Details page
- Separate available-stock and distinct-seller counts
- Listing-specific checkout through `seller_listing_id`
- Canonical BTEB curriculum dataset in `src/data/btebCurriculum.ts`

Existing authentication, profiles, orders, pickup/PIN, wishlist, reviews, requests, notifications, disputes, admin behavior, and model/listing relationships were preserved.

## 6. Final SQL Migration Sequence

The working final migration files are:

```text
1. schema-bteb-2022-01-STRUCTURE.sql
2. schema-bteb-2022-02-SEED-NO-STAGING.sql
3. schema-bteb-2022-curriculum-smoke-test.sql
4. schema-bteb-2022-final-verification.sql
```

The first combined curriculum migration and its first fixed version are deprecated because Supabase SQL Editor did not retain the staging relation between statements.

Deprecated files:

```text
schema-bteb-2022-curriculum.sql
schema-bteb-2022-curriculum-FIXED.sql
```

They must not be run again.

## 7. Supabase Execution Result

The final seed execution returned:

```text
source_mapping_count = 258
source_unique_model_count = 153
models_inserted_this_run = 0
mappings_upserted_this_run = 258
conflicts_recorded_this_run = 0
```

`models_inserted_this_run = 0` was expected because the Book Models had already been inserted during an earlier attempt. The final seed safely reused those models and upserted all curriculum mappings.

Final read-only verification returned:

```text
curriculum_mappings = 258
duplicate_models = 0
orphan_mappings = 0
title_conflicts = 0
```

## 8. SQL File Retention

SQL files are not required by the browser at runtime, but should remain in the repository as migration history.

Recommended structure:

```text
sql/
├── baseline/
├── applied/
├── current/
├── verification/
└── deprecated/
```

Previously applied migration files should be retained but not rerun against the current database.

## 9. Remaining Local Verification

Run these commands from the latest project folder:

```powershell
npm install
npm run lint
npm run build
npm run dev
```

Then verify:

1. Default catalog models appear in Browse.
2. Zero-offer models display Unavailable and Stock 0.
3. Sell this book opens with the correct model preselected.
4. Publishing one Available offer changes stock to 1.
5. The details page shows that specific seller offer.
6. Reserved, Sold, and Inactive listings do not count as available stock.
7. Checkout continues to bind to the selected `seller_listing_id`.

## 10. Security Notes

- No service-role key is stored in the project.
- Ordinary sellers cannot create or modify Book Models directly.
- Curriculum and model mutations remain admin/migration controlled.
- Stock is derived from seller listings rather than trusted from the client.
- Existing model titles and common covers were not silently overwritten.
- Seed conflicts are recorded for admin review.

## Conclusion

The BTEB Regulation 2022 catalog and curriculum database upgrade is complete and verified. The database contains 258 valid curriculum mappings, with no duplicate models, orphan relations, or title conflicts. The remaining work is local frontend lint/build and end-to-end UI testing using the updated project source.


## Admin Book Model Manager Addition

A database-backed Book Model Manager has been added to the Admin panel. Admins can create and edit models with curriculum mappings, search models, change active/hidden status, and safely delete unused models. Permanent deletion is blocked when seller listings or wishlists reference the model. Listing moderation now correctly targets `seller_listing_id`.

Apply `schema-admin-book-model-manager.sql`, then run the read-only `schema-admin-book-model-manager-smoke-test.sql`.


## Haque / Technical Publication Support

Added a strict two-publication workflow across Book Models and Seller Listings. Admins can set a model default, sellers must choose Haque Publication or Technical Publication when listing a copy, and buyers see the corresponding badge on catalog cards, details, individual offers, and checkout confirmation. The database patch adds constrained publication columns and replaces the admin/listing RPC signatures with publication-aware versions.

Apply `schema-publication-support.sql`, then run `schema-publication-support-smoke-test.sql`.


## Publication-specific Cover Architecture

Added `book_publication_editions` with separate Haque and Technical slots per Book Model. The catalog, Sell preview, Book Details, seller offers, and order mapping now resolve the correct publication cover with safe fallbacks. Admin can maintain both publication records. A strict manifest importer and example manifest are included for approved catalog data; automated Haque scraping remains intentionally disabled until the source structure and image-reuse permission are verified.

Apply `schema-publication-editions.sql`, then run `schema-publication-editions-smoke-test.sql`.
