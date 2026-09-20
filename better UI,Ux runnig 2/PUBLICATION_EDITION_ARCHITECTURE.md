# Publication-specific Book Covers

## Purpose

A single BTEB Book Model remains canonical by subject code. Publication-specific metadata lives in `book_publication_editions`, with exactly one slot for Haque Publication and one slot for Technical Publication.

## Current rollout

- Haque source: `https://haquepublications.com/`
- Technical source: pending
- Both database/UI slots are ready now.
- No website image is copied automatically until reuse permission and source-page structure are verified.

## Cover resolution

1. Use the selected seller offer's publication-specific cover.
2. Otherwise use the Book Model's common cover.
3. Otherwise show `Cover Coming Soon`.

## Database setup

Run:

1. `schema-publication-editions.sql`
2. `schema-publication-editions-smoke-test.sql`

Expected with 153 models:

- `total_edition_slots = 306`
- `haque_slots = 153`
- `technical_slots = 153`
- `invalid_publications = 0`
- `models_missing_two_slots = 0`

## Admin workflow

The Book Model editor contains separate Haque and Technical sections for cover URL, source URL, author override, edition label, and reference price. Technical fields can remain empty until a source becomes available.

## Manifest importer

A permission-gated importer is included:

```powershell
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_LOCAL_SERVICE_ROLE_KEY"
$env:COPY_COVERS_TO_STORAGE="true"
$env:APPROVED_IMAGE_HOSTS="haquepublications.com,www.haquepublications.com"
npm run import:publication-manifest -- publication-import-manifest.example.json
```

Never commit, paste into chat, or share the service-role key. `COPY_COVERS_TO_STORAGE=true` should only be used after confirming permission to reuse the covers. Without it, approved remote URLs can be recorded directly in the manifest.

The importer matches strictly by subject code, rejects unsupported publications, refuses unapproved image hosts, limits images to 5 MB, and reports missing or duplicate models.
