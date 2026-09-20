# Polytechnic Used Book Marketplace — Updated PRD

> **Version:** 2.0  
> **Updated:** 19 September 2026  
> **Status:** Current source of truth  
> **Project:** Illdoor / Polytechnic Used Book Marketplace

## Document precedence

This document replaces the old listing-centric product plan. If any older PRD, README, SQL comment, UI text, task, or implementation note conflicts with this document, **this PRD takes precedence**.

The most important architectural decision is:

> **A book and a seller's physical copy are no longer the same database entity.**

- `books` stores one shared **Book Model**.
- `seller_listings` stores one seller's **physical copy/offer**.
- Orders purchase a specific `seller_listing_id`.
- Wishlist saves the model-level `book_id`.

---

## 1. Product definition

Illdoor is a verified, institute-based marketplace where Polytechnic students buy and sell used academic books through campus pickup points.

The platform combines:

- Academic book discovery
- Student identity and institute isolation
- Multiple seller offers under one common book
- Seller-specific ordering
- Campus pickup and PIN verification
- Escrow-style payment states
- Transaction-backed reviews
- Notifications, reports, disputes, and administration

A user has one account and can act as both buyer and seller.

---

## 2. Product goals

1. Prevent duplicate search results for the same academic book.
2. Let buyers compare multiple physical copies and sellers from one details page.
3. Ensure an order reserves only the selected seller's copy.
4. Keep marketplace activity inside the buyer's and seller's institute.
5. Preserve authentication, profiles, pickup, orders, reviews, wishlist, requests, reports, disputes, notifications, and admin tools.
6. Make missing configuration and runtime errors visible instead of showing a blank page.
7. Keep the project deployable on Vercel or Netlify with Supabase.

---

## 3. Target users

### Student

A student can:

- Register and sign in
- Maintain one institute-based profile
- Search and filter book models
- Compare seller offers
- Save a book model to wishlist
- List a physical copy for sale
- Buy a specific seller listing
- View purchases and sales
- Cancel eligible orders
- Receive pickup and order notifications
- Review a completed transaction
- Request unavailable books
- Open a dispute for an eligible order

### Campus desk/admin

An admin can:

- Manage book models separately from seller listings
- Create, hide, and restore models
- Replace the common model cover
- Moderate seller listings
- Review users and verification requests
- Manage orders, pickup flow, reports, and disputes
- Verify pickup PINs
- Review de-duplication conflicts

---

## 4. Authoritative marketplace architecture

### 4.1 Book Model — `books`

A Book Model represents common academic metadata shared by every seller copy.

Core fields:

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
status: active | hidden
views_count
created_at
updated_at
```

Rules:

- One academic book should normally appear once in search/browse.
- Common metadata is not owned by an individual seller.
- Normal sellers cannot edit model metadata or the common cover.
- Admins manage model metadata and visibility.
- A model may temporarily exist without an available seller offer so the first seller can select it.

### 4.2 Seller Listing — `seller_listings`

A Seller Listing represents one seller's physical copy and commercial offer.

Core fields:

```text
id
book_id -> books.id
seller_id -> profiles.id
condition
condition_details
original_price
selling_price
availability: Available | Reserved | Sold | Inactive
pickup_point_id
pickup_point_name
created_at
updated_at
```

Rules:

- Every listing belongs to exactly one Book Model and one seller.
- Copy-specific condition, notes, price, and pickup point live here.
- Selling price must be positive and cannot exceed original price.
- Sellers may switch an eligible listing only between `Available` and `Inactive`.
- Reserved or Sold listings cannot be manually reactivated.
- Protected state transitions occur through secured database functions.

### 4.3 Relationships

```text
books.id -> seller_listings.book_id
profiles.id -> seller_listings.seller_id
seller_listings.id -> orders.seller_listing_id
seller_listings.id -> reviews.seller_listing_id
books.id -> wishlist.book_id
seller_listings.id -> book_requests.fulfilled_by_listing_id
```

An order resolves its common book through:

```text
Order -> Seller Listing -> Book Model
```

---

## 5. Model de-duplication and migration rules

Existing listing-shaped `books` rows are migrated into `seller_listings`; new `books` rows become shared models.

Grouping priority:

1. Exact normalized `subject_code` when present.
2. Otherwise normalized `title + department + semester`.
3. Metadata conflicts or uncertain fallback matches must be flagged for manual review.

Normalization should:

- Trim whitespace
- Compare case-insensitively
- Normalize repeated spaces and punctuation where practical

Common cover rule:

- Use the first image from the earliest-created listing in each group.
- The selected image becomes `books.common_image_url`.
- Old storage objects may remain; storage cleanup is deferred.

Conflict reporting must identify groups with inconsistent:

- Title
- Author
- Edition
- Department
- Semester
- Subject code

The `book_model_migration_report` is admin-only and is not public marketplace data.

---

## 6. Homepage and browse behavior

Marketplace cards represent Book Models, not seller rows.

Each card should show:

```text
Common cover
Title
Author (where useful)
Subject code
Department
Semester
From ৳X
Available seller count
Available condition summary
```

Rules:

- One model appears once, regardless of the number of offers.
- `From ৳X` uses the lowest **available, institute-visible** offer.
- Seller count uses available offers visible to the current institute.
- Empty models remain selectable in Sell flow but should not appear as purchasable Browse/Home results.
- Model cards must not present one arbitrary seller's verification, pickup point, or condition as if it applied to the whole model.

Search fields:

- Title
- Author
- Subject code
- Subject name
- Department

Filters:

- Department
- Semester
- Subject code/name
- Price range across available offers
- Condition across available offers
- Availability
- Sorting: recommended, newest, lowest price, highest price

---

## 7. Book details page

The details page has two layers.

### Shared model section

- Common cover
- Title
- Author
- Edition
- Subject code/name
- Department
- Semester
- Starting price
- Available seller count

### Seller offers section

Each offer card shows:

- Seller identity and verification
- Seller rating
- Copy condition
- Condition notes
- Original price
- Selling price
- Pickup point
- Availability
- “Buy this copy” action

The buyer must explicitly select one offer. Checkout must pass that offer's `seller_listing_id`, never only the model `book_id`.

---

## 8. Sell flow

The new sell flow is **model first**.

```text
Sell Now
  -> Search by title or subject code
  -> Select an existing Book Model
  -> Enter copy condition and notes
  -> Enter original and selling price
  -> Select an active pickup point
  -> Publish Seller Listing
```

Seller-entered fields:

```text
condition
condition_details
original_price
selling_price
pickup_point_id
```

Seller must not re-enter or override:

```text
title
author
edition
subject code
subject name
department
semester
common cover
```

If a model does not exist:

- The seller should use a controlled request/review workflow.
- Admin reviews and creates the common model.
- The user can then list the physical copy.

A Book Request's “I have this book” action should prefill model search using title/subject code and carry the suggested budget where appropriate.

---

## 9. Wishlist

Wishlist is model-level.

```text
wishlist.user_id
wishlist.book_id -> books.id
UNIQUE(user_id, book_id)
```

Saving a book means the user is interested in that common model, not one seller copy.

Potential notifications:

- New seller offer added
- Lower price available
- Similar model listed
- Model has no remaining offers

---

## 10. Orders

Orders purchase one specific Seller Listing.

Core reference:

```text
orders.seller_listing_id -> seller_listings.id
```

Required server-side checks during order placement:

- User is authenticated
- Listing exists
- Listing is `Available`
- Buyer is not the seller
- Buyer and seller belong to the same institute
- Pickup point is active and valid
- Listing row is locked to prevent concurrent purchase

Successful placement must atomically:

1. Create the order.
2. Set only that listing to `Reserved`.
3. Generate order number and verification PIN.
4. Notify buyer.
5. Notify seller.

Other offers for the same Book Model remain unchanged.

### Listing lifecycle

```text
Available
  -> Reserved when ordered
  -> Sold when pickup completes
```

Cancellation before completion:

```text
Reserved -> Available
Paid (Escrow) -> Refunded
```

### Order statuses

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

### Payment states

```text
Pending
Paid (Escrow)
Released to Seller
Refunded
```

---

## 11. Pickup and PIN verification

- Each order has one pickup point and one verification PIN.
- Only an authorized campus desk/admin can verify the PIN.
- Successful verification completes the order, marks the selected listing Sold, releases escrow state, updates buyer/seller statistics, and sends notifications.
- A completed order cannot be completed again.

---

## 12. Reviews

Reviews are transaction-backed and listing-aware.

```text
reviews.order_id
reviews.seller_listing_id
reviews.reviewer_id
reviews.reviewee_id
```

Rules:

- Only completed orders can be reviewed.
- Only buyer or seller in the order can submit a review.
- Reviewee is always the counterparty.
- The database derives/validates `seller_listing_id` from the order.
- Duplicate review rules are enforced at database level.

---

## 13. Book Requests

A request stores:

```text
requester_id
title
subject_code
department
semester
max_budget
description
status
fulfilled_by_listing_id
```

When a matching seller listing is created:

- Open requests with matching normalized subject code are notified.
- Requesters do not receive a notification for their own listing.
- Fulfilment references the seller listing, not the common model alone.

---

## 14. Reports and disputes

Order disputes must reference the migrated relationship:

```text
orders.seller_listing_id
  -> seller_listings.book_id
  -> books.title
```

Rules:

- Only order participants can open a dispute.
- Completed, cancelled, or already disputed orders cannot be disputed again.
- Opening a dispute freezes the order in `disputed` state.
- Admin resolution may refund/cancel and release the listing according to policy.
- Listing-only reports must identify the specific seller listing being reported, not only the subject code/model.

---

## 15. Notifications

Required events:

- New order to seller
- Order confirmation to buyer
- Cancellation/refund to both parties
- Seller drop-off reminders
- Ready for pickup
- Pickup completed to buyer
- Sale completed/funds released to seller
- Matching book request
- Verification status
- Review created
- Dispute updates

Notification links should navigate to the relevant order, model details page, request, or admin review item.

---

## 16. Admin panel

Admin navigation separates:

### Book Models

- Create model
- Edit common metadata
- Replace common cover
- Hide/restore model
- Review de-duplication conflicts
- View seller count and lowest price

### Seller Listings

- View seller and physical-copy details
- Filter by availability
- Moderate/hide/delete eligible listings
- Inspect Reserved/Sold state
- View related model and orders

Additional existing admin areas remain:

- Users and verification
- Orders and pickup
- Reviews
- Book requests
- Reports/disputes
- Notifications
- Pickup points

---

## 17. Institute isolation

- Normal users see and buy offers belonging to their institute.
- Model-level price, seller count, seller identity, condition, and pickup information must be recalculated after institute filtering.
- A cross-institute checkout must fail server-side even if attempted through direct API calls.
- Admins may inspect all institutes according to admin permissions.

---

## 18. Authentication and profiles

Existing authentication and profile behavior must be preserved.

Profile data includes:

- Full name
- Email
- Student roll/ID
- Registration number where applicable
- Institute
- Department
- Semester
- Phone
- Avatar
- Verification status
- Rating and transaction counters
- Admin flag

Private profile fields must be loaded through protected access. Public seller joins expose only marketplace-safe fields.

---

## 19. Security and RLS

Non-negotiable database controls:

- RLS enabled on user-facing tables.
- Model writes are admin-only.
- Seller Listing creation occurs through a validated RPC.
- Sellers cannot directly update protected listing columns.
- Eligible availability changes use a secured RPC.
- Buyers cannot reserve an unavailable listing.
- Concurrent checkout uses row locking.
- Order participants see/update only permitted records.
- Review validation happens server-side.
- Admin-only reports and verification data are not public.
- Storage upload paths are user-scoped.
- Never expose `service_role`, database password, or JWT secret in frontend code.

Frontend environment variables may contain only:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

The anon/publishable key is public by design; RLS provides authorization.

---

## 20. Image strategy

Current model:

- One admin-managed common image per Book Model.
- Sellers do not upload duplicate cover images during the model-first Sell flow.
- Existing seller image objects may remain in storage after migration.
- Storage cleanup is deferred.

Future option:

- Add seller-specific condition photos as a separate listing-photo feature without replacing the common model cover.

---

## 21. Technology and deployment

Current implementation stack:

```text
React 19
TypeScript
Vite 8
Tailwind CSS
Supabase Auth/PostgreSQL/Storage/Realtime
Vercel or Netlify
```

Runtime requirement:

```text
Node.js >= 20.19
```

Deployment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Build:

```text
npm ci
npm run lint
npm run build
```

Output:

```text
dist
```

Deployment rules:

- Do not deploy uploaded/cross-platform `node_modules`.
- Do not commit `.env.local`.
- Configure SPA fallback.
- Add production and preview domains to Supabase Auth URL Configuration.
- Missing configuration must show a setup screen, not a white page.
- Unexpected React runtime errors must be caught by an Error Boundary.

---

## 22. Database migration order

For an existing installation, use the documented migration sequence and do not re-run obsolete listing-centric patches after the model/listing migration.

Current sequence:

```text
1. Existing base/P0/P1 migrations, if not already applied
2. schema-model-listing-migration-FIXED.sql
3. schema-model-listing-production-fixes.sql
4. schema-model-listing-production-smoke-test.sql (read-only verification)
```

A successful SQL command returning `Success. No rows returned` is normal for DDL/function updates.

---

## 23. Acceptance criteria

### Search and browse

- Searching Engineering Mathematics-1 returns one model card.
- Card shows the lowest institute-visible available price.
- Card shows the correct available seller count.

### Details and offers

Given:

```text
Seller A: ৳400, Good, Some writing
Seller B: ৳450, Like New, No writing
Seller C: ৳350, Used, Highlighting present
```

The details page shows one common cover and three independent offers.

### Checkout

- Buying Seller B creates an order for Seller B's `seller_listing_id`.
- Seller B becomes Reserved.
- Seller A and Seller C remain Available.
- Buyer and Seller B receive appropriate notifications.

### Cancellation/completion

- Eligible cancellation refunds escrow and restores only Seller B's listing.
- Successful desk PIN completion marks only Seller B's listing Sold.
- Completed order enables transaction review.

### Security

- Seller cannot change model metadata.
- Seller cannot directly mark a listing Sold/Reserved.
- Cross-institute checkout fails.
- Buyer cannot buy their own listing.
- Two buyers cannot reserve the same listing.

### Reliability

- Missing environment variables show setup instructions.
- Runtime render errors show recovery UI.
- Type checking and production build pass on a clean dependency installation.

---

## 24. Deferred work

The following are not blockers for the current model/listing release:

- Old storage object cleanup
- Live bKash/Nagad integration
- Production payout provider
- Route backward compatibility for a not-yet-deployed site
- Advanced fuzzy de-duplication beyond normalized fallback and manual review
- Seller-specific condition photo gallery
- Email/SMS notifications

---

## 25. Non-negotiable implementation rules

1. Never return to one independent `books` row per seller.
2. Never create an order using only model `book_id`.
3. Never treat a model card's common metadata as seller-specific data.
4. Never calculate price or seller count before institute visibility filtering.
5. Never allow client UI restrictions to replace database authorization.
6. Never expose private Supabase credentials.
7. Preserve working auth, profiles, orders, pickup, notifications, wishlist, reviews, requests, reports, disputes, and admin features during future changes.
8. Update this PRD whenever an approved architecture or product decision changes.

---

## 26. Version 2.0 change summary

The previous plan described each seller submission as a complete book record with seller-uploaded photos. Version 2.0 changes that design to:

```text
Old: Seller -> independent Book row -> Order
New: Book Model -> Seller Listings -> specific Listing Order
```

This change removes duplicate marketplace results, enables offer comparison, makes wishlist model-level, ensures seller-specific checkout, and gives admins separate control over common book data and physical seller copies.


## BTEB Regulation 2022 Default Catalog Addendum

The initial production catalog is seeded from the approved curriculum dataset for Computer Science & Technology (85), Civil (64), Electrical (67), Mechanical (70), and Electronics (68).

- The seed contains 258 curriculum mappings and 153 shared Book Models.
- A shared subject code has one Book Model and multiple `curriculum_entries` rows.
- Every active model remains visible even when it has zero seller offers.
- Zero available offers renders `Unavailable`, `Stock 0`, `No seller offer yet`, and `Sell this book`.
- Available stock counts only same-institute `seller_listings` with `availability = 'Available'`.
- Reserved, Sold, and Inactive listings never count as available stock.
- Seller count is distinct sellers and may differ from physical stock.
- The Sell flow is Department → Semester → Subject Model, followed only by physical-copy fields.
- Existing model titles and covers are never silently overwritten by the curriculum seed; conflicts require admin review.


## 19. Admin Book Model Manager (Implemented)

The operations admin can manage the canonical catalog directly from Admin → Book Models.

- Add a Book Model and its curriculum mapping in one workflow.
- Edit shared metadata: title, author, edition, subject identity, regulation, department, semester, cover, ISBN, and visibility.
- Hide or reactivate models without removing marketplace history.
- Permanently delete only unused models with no seller-listing or wishlist references.
- Preserve existing shared curriculum mappings when adding or updating another mapping.
- Perform every mutation through admin-only `SECURITY DEFINER` functions with explicit `search_path` and execute grants.
- Listing moderation must act on `seller_listing_id`, never the parent Book Model ID.

Required database patch: `schema-admin-book-model-manager.sql`.


## 20. Publication Classification (Implemented)

Only two publication values are accepted throughout the marketplace: **Haque Publication** and **Technical Publication**.

- Every Book Model has an admin-managed default publication.
- Every Seller Listing stores the publication of that specific physical copy.
- The Sell flow requires the seller to choose one of the two supported publications.
- Catalog cards use the selected/lowest-priced active offer publication for the visible badge; zero-offer models use the model default.
- Book Details shows the model publication and a publication badge for each seller offer.
- Checkout confirmation repeats the selected offer publication.
- Database CHECK constraints and secured RPC validation reject every other publication value.


## 21. Publication-specific Edition Assets (Implemented)

- Keep one canonical Book Model per BTEB subject code.
- Store Haque and Technical metadata in separate `book_publication_editions` rows.
- Maintain exactly two edition slots per model.
- Resolve the displayed cover from the selected/primary Seller Listing publication.
- Fall back to the model common cover, then a Cover Coming Soon placeholder.
- Allow admins to edit publication cover, source URL, author override, edition label, and reference price.
- Keep the Technical slot empty but fully supported until a source is available.
- Import external catalog manifests only by exact subject-code match and only copy images from explicitly approved hosts.
