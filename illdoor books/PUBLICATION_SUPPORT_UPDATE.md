# Haque / Technical Publication Support

## Implemented

- Book Model default-publication selector in Admin.
- Seller publication selector in the Sell flow.
- Only `Haque Publication` and `Technical Publication` are accepted.
- Publication stored on both `books` and `seller_listings`.
- Publication badges on catalog cards and Book Details.
- Publication badge on every seller offer.
- Selected publication repeated in purchase confirmation.
- Existing rows are backfilled to `Haque Publication` for compatibility and can be corrected by admins/new sellers.
- Database CHECK constraints and secured RPC validation reject other values.

## Required Supabase action

Run:

1. `schema-publication-support.sql`
2. `schema-publication-support-smoke-test.sql`

The first file is self-contained and includes the final Admin Book Model Manager RPCs. Do not rerun older model/listing migrations.
