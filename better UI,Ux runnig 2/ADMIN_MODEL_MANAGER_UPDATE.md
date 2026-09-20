# Admin Book Model Manager Update

## Implemented

- Database-backed **Add model** form in Admin → Book Models.
- Edit title, subject code/name, author, edition, regulation, technology, department, semester, common cover, ISBN, and model status.
- Model creation also creates the selected `curriculum_entries` mapping.
- Existing shared curriculum mappings are preserved during edits.
- Hide/activate uses an admin-only database function.
- Permanent delete works only for unused models.
- Delete is blocked when seller listings or wishlists reference the model.
- Model search and clear active/hidden status indicators.
- Fixed listing moderation so pause/delete targets the seller listing ID rather than the Book Model ID.

## Required database action

Run in Supabase SQL Editor:

1. `schema-admin-book-model-manager.sql`
2. `schema-admin-book-model-manager-smoke-test.sql`

The first file installs three admin-only functions. The second file is read-only and should return `true` for all six function/permission checks.
