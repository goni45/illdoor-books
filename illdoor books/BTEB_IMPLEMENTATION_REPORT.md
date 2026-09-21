# BTEB Curriculum Implementation Report

## Final status

The Regulation 2022 default catalog has been applied to Supabase and verified successfully.

```text
curriculum_mappings = 258
duplicate_models = 0
orphan_mappings = 0
title_conflicts = 0
```

## Implemented

- Preserved the existing Book Model + Seller Listing architecture.
- Added 258 curriculum mappings for five launch technologies.
- Reused 153 unique subject-code Book Models.
- Added `curriculum_entries` for shared department/semester membership.
- Added conflict-safe, idempotent model seeding.
- Added institute-scoped seller-listing visibility and derived stock.
- Added curriculum-aware catalog filters and Sell selector.
- Added `Unavailable`, `Stock 0`, and `Sell this book` states.
- Preserved listing-specific checkout through `seller_listing_id`.

## Technology counts

| Technology | Code | Mappings |
|---|---:|---:|
| Computer Science & Technology | 85 | 52 |
| Civil Technology | 64 | 54 |
| Electrical Technology | 67 | 49 |
| Mechanical Technology | 70 | 51 |
| Electronics Technology | 68 | 52 |
| **Total** |  | **258** |

## Authoritative SQL sequence

```text
1. schema-bteb-2022-01-STRUCTURE.sql
2. schema-bteb-2022-02-SEED-NO-STAGING.sql
3. schema-bteb-2022-curriculum-smoke-test.sql
4. schema-bteb-2022-final-verification.sql
```

The older combined curriculum migration and its first fixed version are deprecated and must not be run.

## Application files updated

- `src/data/btebCurriculum.ts`
- `src/types.ts`
- `src/context/MarketplaceContext.tsx`
- `src/pages/SellBookPage.tsx`
- `src/pages/BookDetailsPage.tsx`
- `src/pages/HomePage.tsx`
- `src/components/BookCard.tsx`
- `src/components/FilterPanel.tsx`
- `src/components/SearchBar.tsx`
- `src/components/common/StatusBadge.tsx`

## Verification notes

- The uploaded project archive passed ZIP integrity checking.
- All relative TypeScript imports resolve.
- TypeScript/JSX syntax validation passed for all source files.
- The canonical dataset passed count, uniqueness, subject-code, semester, and per-technology checks.
- No environment secret, service-role key, database URL, or private key was found in the archive.
- Full dependency installation and production build could not run in the sandbox because npm registry DNS was unavailable. Run the local commands below before deployment.

```powershell
npm install
npm run lint
npm run build
```
