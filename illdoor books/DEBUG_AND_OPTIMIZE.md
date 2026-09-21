# Illdoor Marketplace — Debugging & Performance Guide

Project: `better UI,Ux` — Vite + React 19 + TypeScript + Tailwind 4 + Supabase
Audit date: 19 September 2026

---

## How to read this document

Every claim below is tagged:

- **[VERIFIED]** — I read the exact line in your source (or in `node_modules`) and confirmed it. File and line numbers are given.
- **[INFERRED]** — Follows from documented browser/library behaviour but I did not measure it on your app. Confirm before acting.

**What I could not do:** your `node_modules` was installed on Windows, so `tsc` fails in a Linux container (`Unable to resolve @typescript/typescript-linux-x64`) and this environment has no network to reinstall. So **I never ran the build, the typechecker, or the app.** Everything is from reading source. Run `npm ci && npm run lint && npm run build` yourself before and after each change.

---

## Table of contents

1. [P0 — Broken features](#p0)
2. [P1 — Security](#p1)
3. [P2 — Performance](#p2)
4. [P3 — Polish](#p3)
5. [Ready-to-apply SQL patch](#sql)
6. [Ready-to-apply code](#code)
7. [Suggested work order](#order)
8. [How to measure](#measure)

---

<a name="p0"></a>
## P0 — Broken features

### P0-1. Uploaded book images are never saved. Every listing shows "No Image". **[VERIFIED]**

This is the most damaging bug in the app.

`src/pages/SellBookPage.tsx:131` calls:

```tsx
const newId = await addBookListing({
  title: title.trim(),
  // ...
  images: [selectedImage],
  // ...
});   // <-- only ONE argument
```

But the function signature at `src/context/MarketplaceContext.tsx:154` is:

```ts
addBookListing: (newBook: Omit<BookListing, ...>, imageFiles?: File[]) => Promise<string>
```

`imageFiles` is never passed, so it is always `undefined`. Inside `addBookListing` (`MarketplaceContext.tsx:~470`) the upload is guarded:

```ts
if (imageFiles && imageFiles.length > 0) {
  const { uploadBookImages } = await import('../lib/imageUpload');
  // ...insert into book_images
}
```

That branch **never runs**. Consequences, all verified:

- `src/lib/imageUpload.ts` (72 lines) is dead code in production. `browser-image-compression` is installed but never executes.
- Nothing is ever written to Supabase Storage or to the `book_images` table from the UI.
- `newBookData.images` is silently discarded — look at the `books` insert, it lists `title, author, edition, subject_code, ... isbn` and no image column (correct, since images live in `book_images`, but nothing writes there).
- On read, `mapDbBookToListing` (`MarketplaceContext.tsx:64`) does `images.length > 0 ? images : ['https://placehold.co/600x400/...?text=No+Image']`. So **every listing a real student creates displays the grey "No Image" placeholder.**

Related, also verified: `src/pages/SellBookPage.tsx:102`

```tsx
const url = URL.createObjectURL(file);
setSelectedImage(url);
```

`URL.revokeObjectURL` appears **nowhere** in `src/`. Each selected file stays in memory until a full page reload. And a `blob:` URL is per-tab and dies on reload — so even if you did persist `selectedImage` as-is, it would be a dead link.

**Fix.** Keep the `File`, not just a preview URL, and pass it through.

```tsx
// SellBookPage.tsx
const [imageFile, setImageFile] = useState<File | null>(null);
const [selectedImage, setSelectedImage] = useState<string>(DEFAULT_PRESET_URL);

const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return;          // reject non-images
  if (file.size > 10 * 1024 * 1024) return;             // reject >10MB before compression

  setSelectedImage(prev => {
    if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);   // stop the leak
    return URL.createObjectURL(file);
  });
  setImageFile(file);
};

// release on unmount too
useEffect(() => () => {
  if (selectedImage.startsWith('blob:')) URL.revokeObjectURL(selectedImage);
}, [selectedImage]);

// and at submit:
const newId = await addBookListing({ ...fields, images: [selectedImage] },
                                   imageFile ? [imageFile] : undefined);
```

Then in `addBookListing`, handle the preset-URL case too — if the seller picked one of your Unsplash presets instead of uploading, insert that URL straight into `book_images`:

```ts
if (imageFiles?.length) {
  const urls = await uploadBookImages(imageFiles, user.id, newBookId);
  if (urls.length) await supabase.from('book_images').insert(urls.map(url => ({ book_id: newBookId, url })));
} else if (newBookData.images?.[0] && !newBookData.images[0].startsWith('blob:')) {
  await supabase.from('book_images').insert({ book_id: newBookId, url: newBookData.images[0] });
}
```

---

### P0-2. "Buy Now" silently does nothing on an empty database **[VERIFIED]**

`refreshBooks` (`MarketplaceContext.tsx:~250`):

```ts
if (error || !booksData || booksData.length === 0) {
  setBooks(INITIAL_BOOKS);
  return;
}
```

`INITIAL_BOOKS` in `src/data/mockData.ts` has ids `'book-1'` … `'book-8'` (lines 166, 193, 219, 245, 271, 297, 323, 349). `schema.sql:40` declares `books.id TEXT PRIMARY KEY` and `schema.sql:74` declares `orders.book_id TEXT NOT NULL REFERENCES public.books(id)`.

So ordering a mock book raises a **foreign-key violation**, and `createOrder` swallows it:

```ts
if (error || !inserted) {
  console.error('Order insert error:', error);
  return '';        // <-- user sees nothing at all
}
```

The student taps Buy Now and the interface does not move. No spinner, no error, no toast.

**Fix.** Two parts:

1. Never present mock data as buyable. Gate the fallback:
   ```ts
   const USE_MOCK = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true';
   if (error || !booksData?.length) { setBooks(USE_MOCK ? INITIAL_BOOKS : []); return; }
   ```
   With an empty array your existing `EmptyState` on `BrowsePage.tsx:113` renders correctly.
2. Surface errors. `createOrder` returning `''` on failure is indistinguishable from success in the caller. Return a result object and show the message.

---

### P0-3. A buyer can never reserve a book (silent RLS failure) **[VERIFIED]**

`schema.sql:159`:

```sql
CREATE POLICY "books_update_own" ON public.books FOR UPDATE USING (auth.uid() = seller_id);
```

`createOrder` calls `updateBookStatus(bookId, 'Reserved')` while running as the **buyer**. Postgres matches zero rows. PostgREST returns 204 with no error. Your code then does:

```ts
setBooks(prev => prev.map(b => b.id === bookId ? { ...b, availability } : b));
```

So the UI shows "Reserved" until the next `refreshBooks`, then it flips back to "Available". **Two students can order the same book.** There is no row lock anywhere in the flow.

**Fix:** the `place_order` RPC in [the SQL patch](#sql). It does `SELECT ... FOR UPDATE`, checks availability, inserts the order, and flips the book to `Reserved` — atomically, as `SECURITY DEFINER`, so RLS does not block it.

---

### P0-4. View counter never fires **[VERIFIED — checked against the installed library source]**

`MarketplaceContext.tsx:~385`:

```ts
supabase.from('books').update({ views_count: ... }).eq('id', bookId);
```

I read `node_modules/@supabase/postgrest-js/src/PostgrestBuilder.ts`. The `then()` method begins at line 212, and the `fetch` call is constructed **inside** it (the chain ends `.then(onfulfilled, onrejected)` at line 367). PostgREST builders are lazy thenables: **no `await` or `.then()` means no HTTP request is ever sent.**

Note this line is double-broken — even with `await`, `books_update_own` (P0-3) blocks a non-seller from updating.

**Fix:** `increment_book_views` RPC in [the SQL patch](#sql), called with `await` (or explicit `void ... .then()` if you want fire-and-forget).

---

### P0-5. Buyer and seller are swapped on every order **[VERIFIED]**

Signature, `MarketplaceContext.tsx:71`:

```ts
function mapDbOrderToOrder(row, book: BookListing, buyer: StudentUser, seller: StudentUser, pickup: PickupPoint): Order
```

Call site, `MarketplaceContext.tsx:289-292`:

```ts
mapDbOrderToOrder(
  row as unknown as Record<string, unknown>,
  book, book.seller, currentUser, pickup
)
```

`buyer` receives `book.seller`; `seller` receives `currentUser`. Reversed. On the Orders page a seller viewing their own sale is labelled as the buyer.

**Fix:** don't guess from the current user — resolve both sides from the row. See [P0-6](#p0-6) for the query.

---

<a name="p0-6"></a>
### P0-6. Orders silently disappear **[VERIFIED]**

`refreshOrders`, `MarketplaceContext.tsx:~285`:

```ts
const book = books.find((b) => b.id === row.book_id);
if (!book) continue;
```

An order is dropped whenever its book isn't in the in-memory `books` array. That happens when `books` is holding the mock fallback (P0-2), when books are paginated, or when the book row was deleted. The user's real order vanishes with no explanation.

**Fix:** join the data in one query instead of cross-referencing client state.

```ts
const { data } = await supabase
  .from('orders')
  .select(`
    *,
    books ( *, book_images(url), profiles!seller_id(*) ),
    buyer:profiles!orders_buyer_id_fkey ( * ),
    seller:profiles!orders_seller_id_fkey ( * )
  `)
  .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
  .order('created_at', { ascending: false });
```

Then `mapDbOrderToOrder(row, mapDbBookToListing(row.books, ...), row.buyer, row.seller, pickup)` — correct order, nothing dropped. Confirm the FK constraint names in your Supabase dashboard; PostgREST needs them for disambiguation when two FKs point at the same table.

---

### P0-7. The register button hangs forever **[VERIFIED]**

`src/hooks/useAuth.ts`, `signUp`:

```ts
setAuthState((prev) => ({ ...prev, loading: true, error: null }));
const { error } = await supabase.auth.signUp({ ... });
if (error) {
  setAuthState((prev) => ({ ...prev, loading: false, error: error.message }));
  return { error: error.message };
}
return { error: null };        // <-- loading is STILL true
```

`loading` only clears when `onAuthStateChange` fires. With email confirmation enabled (Supabase default), **it does not fire on signup.** Meanwhile `AuthPage.tsx:193` sets the success banner.

Result: the user sees "Registration successful! Please check your email…" next to a permanently disabled button reading "রেজিস্ট্রেশন হচ্ছে…" (`AuthPage.tsx:466,473`).

**Fix:** add `setAuthState(prev => ({ ...prev, loading: false }));` before the success `return`.

---

### P0-8. "Newest" sort is alphabetical **[VERIFIED]**

`mapDbBookToListing` converts the timestamp to a display string:

```ts
createdAt: new Date(row.created_at).toLocaleDateString('en-BD', { day:'numeric', month:'short', year:'numeric' })
```

Then `filteredBooks` sorts on that string:

```ts
if (filters.sortBy === 'newest') return b.createdAt.localeCompare(a.createdAt);
```

`"18 Sep 2026"` vs `"4 Apr 2026"` compares character by character. April outranks September; the 4th outranks the 18th. The "Newest Listed" option in `BrowsePage.tsx:99` returns near-random order.

**Fix:** keep the raw value alongside the formatted one.

```ts
// types.ts — add to BookListing and Order
createdAtRaw: string;

// mapper
createdAtRaw: row.created_at as string,

// sort
if (filters.sortBy === 'newest')
  return Date.parse(b.createdAtRaw) - Date.parse(a.createdAtRaw);
```

Same issue exists in `mapDbOrderToOrder` for `createdAt` / `updatedAt`.

---

### P0-9. Every modal, drawer and dropdown animation is dead **[VERIFIED]**

`src/index.css` line 1 is its only import:

```css
@import "tailwindcss";
```

There is **no `@plugin` directive anywhere in the file**, and neither `tailwindcss-animate` nor `tw-animate-css` is present in `node_modules` or `package.json`.

But these classes appear 13 times across the app:

| File | Line | Class |
|---|---|---|
| `Navbar.tsx` | 133 | `animate-in fade-in slide-in-from-top-2` |
| `Navbar.tsx` | 267 | `animate-in fade-in slide-in-from-top-2` |
| `BookDetailsPage.tsx` | 360 | `animate-in fade-in` |
| `BookDetailsPage.tsx` | 361 | `animate-in zoom-in-95` |
| `BrowsePage.tsx` | 129 | `animate-in fade-in` |
| `BrowsePage.tsx` | 134 | `animate-in slide-in-from-right` |
| `SellBookPage.tsx` | 158 | `animate-in zoom-in-95` |
| `SellBookPage.tsx` | 238, 374, 515 | `animate-in fade-in` |
| `AuthPage.tsx` | 216 | `animate-in fade-in` |
| `HomePage.tsx` | 335 | `animate-in fade-in` |
| `OrdersPage.tsx` | 349 | `animate-in fade-in` |

None of them resolve to CSS. Every modal snaps into existence with zero transition. This is a large part of why the app doesn't feel "smooth" — and it's the cheapest fix in this document.

**Fix.** In Tailwind 4 you add plugins from CSS:

```bash
npm i -D tw-animate-css
```
```css
/* src/index.css, line 2 */
@import "tailwindcss";
@import "tw-animate-css";
```

Or, if you don't want the dependency, define the four keyframes you actually use by hand:

```css
@keyframes fade-in   { from { opacity: 0 } to { opacity: 1 } }
@keyframes zoom-in-95{ from { opacity: 0; transform: scale(.95) } to { opacity: 1; transform: none } }
@keyframes slide-in-from-top-2   { from { opacity: 0; transform: translateY(-.5rem) } to { opacity: 1; transform: none } }
@keyframes slide-in-from-right   { from { transform: translateX(100%) } to { transform: none } }

.animate-in { animation-duration: .2s; animation-fill-mode: both; animation-timing-function: cubic-bezier(.4,0,.2,1) }
.fade-in            { animation-name: fade-in }
.zoom-in-95         { animation-name: fade-in, zoom-in-95 }
.slide-in-from-top-2{ animation-name: fade-in, slide-in-from-top-2 }
.slide-in-from-right{ animation-name: slide-in-from-right }

@media (prefers-reduced-motion: reduce) { .animate-in { animation: none } }
```

---

### P0-10. Choosing the cafeteria pickup point silently changes it **[VERIFIED]**

`src/data/mockData.ts` defines four pickup points: `pk-1`, `pk-2`, `pk-3`, `pk-4` ("Campus Cafeteria Locker Station", line 65).

`schema.sql:201-211` seeds only three: `pk-1`, `pk-2`, `pk-3`.

`SellBookPage.tsx:15` imports `PICKUP_POINTS` from `mockData`, so the dropdown offers all four. Then `addBookListing`:

```ts
const pickup = pickupPoints.find((p) => p.id === newBookData.pickupPointId) ?? pickupPoints[0];
```

`pickupPoints` is context state loaded from the database (three rows). `find('pk-4')` returns `undefined`, so it falls back to `pickupPoints[0]` — the Central Library. The seller chose the cafeteria; the listing says Central Library; nobody is told.

**Fix:** either seed `pk-4` in `schema.sql`, or drive the dropdown from context (`const { pickupPoints } = useMarketplace()`) instead of importing mock data. The second is correct — the mock list should never reach a form.

---

### P0-11. Signup phone number is discarded **[VERIFIED]**

`useAuth.signUp` sends `phone` in `raw_user_meta_data`. But `schema.sql:238`:

```sql
INSERT INTO public.profiles (id, email, full_name, student_roll, institute, department, semester)
```

No `phone` column in the list. Every profile ends up with `phone = NULL`, so the buyer/seller contact number never appears anywhere.

**Fix:** in [the SQL patch](#sql).

---

<a name="p1"></a>
## P1 — Security

### P1-1. Escrow release is enforced only in the browser **[VERIFIED — fix this first]**

`schema.sql:179`:

```sql
CREATE POLICY "orders_update_participants" ON public.orders FOR UPDATE USING (
  auth.uid() = buyer_id OR auth.uid() = seller_id
);
```

No `WITH CHECK`. No column restriction. Meanwhile `verifyPickupPin` in `MarketplaceContext.tsx` compares the PIN **in JavaScript** and then writes:

```ts
await supabase.from('orders')
  .update({ status: 'completed', payment_state: 'Released to Seller' })
  .eq('id', orderId);
```

Any buyer can open the browser console and call that same update directly, without the PIN and without collecting the book. They can also rewrite `price`, or `verification_pin`, or flip `status` to any allowed value. The `verification_pin` column is also readable by both participants via `orders_select_participants`, so the buyer's own client already has every secret the check depends on.

For a marketplace holding student money this is the bug that gets you a real complaint.

**Fix.** Move verification server-side and lock the columns down — both in [the SQL patch](#sql). Client becomes:

```ts
const { data, error } = await supabase.rpc('verify_pickup_pin', { p_order_id: orderId, p_pin: pin.trim() });
```

### P1-2. `handle_new_user` is `SECURITY DEFINER` without a fixed `search_path` **[VERIFIED]**

`schema.sql:235-250`. Supabase's own database linter flags this (`function_search_path_mutable`) as a privilege-escalation path. Add `SET search_path = public, pg_temp`. Same applies to every new function in the patch below.

### P1-3. Storage insert policy is unscoped **[VERIFIED]**

`schema.sql:227`:

```sql
CREATE POLICY "book_covers_insert_auth" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'book-covers' AND auth.role() = 'authenticated');
```

Any signed-in user may write to any path in the bucket, including another student's `userId/` folder. The delete policy right below it is correctly scoped with `storage.foldername(name))[1]`; the insert policy should match:

```sql
WITH CHECK (bucket_id = 'book-covers' AND auth.uid()::text = (storage.foldername(name))[1])
```

(Only matters once P0-1 is fixed and uploads actually happen — but fix them together.)

### P1-4. `.env.local` shipped inside the zip **[VERIFIED]**

Your `.gitignore` correctly contains `.env*` with `!.env.example`, so it likely never reached git. The anon key is designed to be public and your RLS is genuinely good, so this is not an emergency — but confirm with `git log --all -- .env.local` that it isn't in history, and rotate if it is.

---

<a name="p2"></a>
## P2 — Performance

### Measured baseline **[VERIFIED]**

```
dist/assets/index-9b3JPj2H.js     738 KB raw / 205 KB gzipped
dist/assets/index-DVtDyYQ3.css     71 KB raw /  13 KB gzipped
dist/assets/imageUpload-*.js       52 KB   (dynamic chunk — dead code, see P0-1)
```

205 KB of gzipped JavaScript before anything renders. On a 3G connection that is several seconds of blank screen.

---

### P2-1. `useAuth()` runs three times **[VERIFIED]**

Call sites: `App.tsx:104`, `AuthPage.tsx:127`, `MarketplaceContext.tsx:179`.

It is a plain hook, not a context — so each call creates its own `getSession()` request, its own `onAuthStateChange` subscription, **and** its own `profiles` fetch inside `fetchProfile`. That is up to six network round-trips before first paint (doubled again in dev by `StrictMode` in `main.tsx:7`), plus three `loading` flags that can disagree.

**Fix:**

```tsx
// src/context/AuthContext.tsx  (new file)
import { createContext, useContext } from 'react';
import { useAuthInternal } from '../hooks/useAuth';   // rename the existing export

type AuthValue = ReturnType<typeof useAuthInternal>;
const AuthCtx = createContext<AuthValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => (
  <AuthCtx.Provider value={useAuthInternal()}>{children}</AuthCtx.Provider>
);

export const useAuth = (): AuthValue => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
```

In `App.tsx`, wrap: `<AuthProvider><AppContent /></AuthProvider>`. Change the three imports from `'../hooks/useAuth'` to `'../context/AuthContext'`. No other edits needed.

---

### P2-2. The context value is rebuilt on every render **[VERIFIED]**

`MarketplaceContext.tsx:~630`:

```tsx
<MarketplaceContext.Provider value={{ activeView, setActiveView, /* ~45 entries */ }}>
```

An object literal in JSX is a new reference every render, so **every** `useMarketplace()` consumer re-renders whenever the provider does — including all `BookCard`s.

Also unmemoized in the same file: `filteredBooks` (the whole `.filter().sort()` chain runs every render), plus the functions `navigateToBook`, `navigateToOrder`, `toggleWishlist`, `isWishlisted`, `resetFilters`, `applyQuickSubjectSearch`, `resolveDispute`.

**Fix:**

```tsx
const filteredBooks = useMemo(
  () => books.filter(/* ... */).sort(/* ... */),
  [books, filters, searchQuery]
);

const isWishlisted = useCallback((id: string) => wishlistIds.includes(id), [wishlistIds]);
// ...wrap the other six in useCallback with correct deps...

const value = useMemo(() => ({ activeView, setActiveView, /* ... */ }), [
  activeView, selectedBookId, selectedOrderId, currentUser, books, pickupPoints,
  wishlistIds, orders, notifications, disputes, dataLoading, filters, searchQuery,
  filteredBooks, unreadNotificationCount, user, isAuthenticated,
  isAuthModalOpen, authModalTab, authModalMessage,
  /* plus every useCallback'd function */
]);

return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
```

And memoize the card: `export const BookCard = React.memo(BookCardImpl);` in `src/components/BookCard.tsx`.

**A correction to advice I gave earlier:** I previously said typing in the search box re-renders the whole app. **That was wrong.** `src/components/SearchBar.tsx:19` already keeps the value in local state (`localValue`) and only pushes to context on form submit. Your search input is fine as written; no debounce needed.

The real hot path is the **price slider** — see next item.

---

### P2-3. The price slider re-renders the entire grid on every drag frame **[VERIFIED]**

`src/components/FilterPanel.tsx:157`:

```tsx
<input type="range" min={100} max={1500} step={50}
  value={filters.maxPrice}
  onChange={(e) => handleMaxPriceChange(Number(e.target.value))} />
```

`onChange` on a range input fires continuously while dragging. Each fire calls `setFilters` → provider re-renders → new context object (P2-2) → `filteredBooks` recomputed → every `BookCard` re-renders. With 24 cards on screen that is a lot of work per frame.

**Fix:** local state while dragging, commit on release.

```tsx
const [draftMax, setDraftMax] = useState(filters.maxPrice);
useEffect(() => setDraftMax(filters.maxPrice), [filters.maxPrice]);

<input type="range" min={100} max={2000} step={50}
  value={draftMax}
  onChange={(e) => setDraftMax(Number(e.target.value))}
  onPointerUp={() => handleMaxPriceChange(draftMax)}
  onKeyUp={() => handleMaxPriceChange(draftMax)} />
```

**Separate bug in the same control [VERIFIED]:** the slider's `max` is `1500`, but `defaultFilters.maxPrice` is `2000` and `BrowsePage.tsx:18` counts a filter as active when `maxPrice < 2000`. On first paint the slider holds a value above its own maximum; the browser pins the thumb to the right while state stays at 2000. Once the user touches it they can never return to 2000, so the "Clear filters" badge appears and cannot be cleared by the slider. Change `max` to `2000` (as shown above) so the control and the default agree.

---

### P2-4. No route-level code splitting **[VERIFIED]**

`App.tsx:8-16` statically imports all nine pages. There is exactly one dynamic import in the codebase (`import('../lib/imageUpload')` inside `addBookListing`), which is why you see a separate `imageUpload-*.js` chunk — and that chunk is currently never loaded (P0-1).

`AdminDashboard.tsx` is 508 lines and ships to every student who will never open it.

```tsx
import { lazy, Suspense } from 'react';

const BookDetailsPage  = lazy(() => import('./pages/BookDetailsPage').then(m => ({ default: m.BookDetailsPage })));
const SellBookPage     = lazy(() => import('./pages/SellBookPage').then(m => ({ default: m.SellBookPage })));
const OrdersPage       = lazy(() => import('./pages/OrdersPage').then(m => ({ default: m.OrdersPage })));
const WishlistPage     = lazy(() => import('./pages/WishlistPage').then(m => ({ default: m.WishlistPage })));
const NotificationsPage= lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ProfilePage      = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AdminDashboard   = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
// keep HomePage and BrowsePage eager

<Suspense fallback={<LoadingScreen />}>
  {/* existing activeView switch */}
</Suspense>
```

Plus vendor chunking in `vite.config.ts`:

```ts
build: {
  target: 'es2020',
  cssCodeSplit: true,
  reportCompressedSize: false,
  rollupOptions: {
    output: {
      manualChunks: {
        react: ['react', 'react-dom'],
        supabase: ['@supabase/supabase-js'],
      },
    },
  },
},
```

---

### P2-5. `motion` ships for exactly one button **[VERIFIED]**

`motion.` appears twice in the entire `src/` tree — the opening and closing tag of one element at `HomePage.tsx:186-209`:

```tsx
<motion.button
  whileHover={{ scale: 1.04, y: -2 }}
  whileTap={{ scale: 0.96 }}
  transition={{ type: 'spring', stiffness: 420, damping: 18 }}
```

Replace with CSS and delete the dependency:

```tsx
<button
  className="... transition-transform duration-200 ease-out
             hover:scale-[1.04] hover:-translate-y-0.5 active:scale-95"
```

```bash
npm rm motion
```

---

### P2-6. Four unused dependencies **[VERIFIED — zero references in `src/`, `index.html`, `vite.config.ts`]**

```bash
npm rm @google/genai express dotenv @types/express
```

`@google/genai`, `express`, `dotenv` and `@types/express` are leftovers from the AI Studio scaffold (`README.md` still describes setting `GEMINI_API_KEY`). There is no `server.js`, and `package.json`'s `clean` script references one that doesn't exist.

Also removable: `autoprefixer` (no `postcss.config.*` exists in the project — Tailwind 4's Vite plugin handles prefixing), and `esbuild` / `tsx` which Vite already vendors.

**Not a problem:** `lucide-react` is imported with named imports across 20 files and tree-shakes correctly under Vite's ESM build. Leave it alone.

---

### P2-7. No database indexes at all **[VERIFIED — `grep -c "CREATE INDEX" schema.sql` returns 0]**

Every query is a sequential scan. Invisible at 50 rows, painful at 5,000. See [the SQL patch](#sql).

---

### P2-8. Fetch waterfall and over-fetching **[VERIFIED]**

Current sequence: session → profile → books → *then* orders + wishlist + notifications + disputes. Five sequential round-trips before the app is usable. The last four are independent of each other:

```ts
await Promise.all([refreshOrders(), refreshWishlist(), refreshNotifications(), refreshDisputes()]);
```

`refreshBooks` uses `.select('*, profiles(*), book_images(url)')` with no limit. `profiles(*)` pulls every seller column — including `email` and `phone` — for every card, when `BookCard.tsx` renders none of it. Narrow it and paginate:

```ts
.select('*, profiles(id, full_name, avatar_url, is_verified, rating), book_images(url)')
.order('created_at', { ascending: false })
.range(0, 23)
```

**Also verified:** this effect re-fires more than it should.

```ts
useEffect(() => {
  if (user && books.length >= 0) { refreshOrders(); refreshWishlist(); refreshNotifications(); refreshDisputes(); }
}, [user, books.length, refreshOrders, refreshWishlist, refreshNotifications, refreshDisputes]);
```

`books.length >= 0` is always true, so it's dead logic. And `refreshOrders` is `useCallback`'d on `[user, books, pickupPoints, currentUser]` while `refreshDisputes` depends on `[user, currentUser.name]` — both get new identities when the profile loads or books change, re-triggering all four fetches. Depend on `user?.id` alone and drop the function identities from the dep array.

---

### P2-9. Glass effects layered over a permanently animating background **[INFERRED — verify with a profile before acting]**

The counts are verified: 14 `backdrop-blur-*` utility usages across 9 files, plus 7 usages of the custom `.glass-*` classes in `index.css`, each of which also declares `backdrop-filter`.

The concentration matters. `BookCard.tsx` carries **two** per card (the wishlist button at line 32, the pickup pill at line 51) — so a Browse page showing 24 cards puts ~48 backdrop-filter surfaces on screen. `BottomGlassNav.tsx` is rendered unconditionally from `App.tsx` and uses `backdrop-blur-2xl` with a nested `backdrop-blur-md` on the active tab. And `App.tsx:52` renders `.ambient-wave-beam` — `position: fixed`, full viewport, `animation: ambient-wave-sweep 9s ... infinite` — behind all of it, on every page.

A `backdrop-filter` element must re-sample whatever is behind it whenever that content changes. A perpetually animating full-viewport backdrop means that content changes every frame. **That is what the specification implies, but I did not measure it on your app** — see [How to measure](#measure).

If a profile confirms it, in order of payoff:

```css
/* index.css — stop the beam where it costs most */
@media (max-width: 768px)              { .ambient-wave-beam { display: none } }
@media (prefers-reduced-motion: reduce){ .ambient-wave-beam { animation: none } }
```

```tsx
// BookCard.tsx — both blurs sit over an opaque photo, so they do nothing visible
// line 32:  bg-white/90 backdrop-blur-xs   ->  bg-white/95
// line 51:  bg-black/60 backdrop-blur-xs   ->  bg-black/70
```

Also verified in `index.css`: `.illdoor-door` animates `filter: drop-shadow(...)` via `@keyframes illdoor-doorGlow`. `filter` is not a compositor-only property, so this repaints every frame it runs. Animate the `opacity` of a pseudo-element carrying a static `radial-gradient` instead.

**Not a problem, and I checked:** the scroll listener in `BottomGlassNav.tsx:10` is registered `{ passive: true }` and calls `setIsVisible(currentScroll > 160)`. React bails out of re-rendering when a `useState` setter receives an identical value, so this is genuinely cheap. Leave it.

---

### P2-10. Fonts block first paint **[VERIFIED]**

`index.html:14` loads three families and eight faces from Google Fonts:

```
Baloo 2 (700, 800) + Instrument Serif (regular, italic) + Inter (400, 500, 600, 700)
```

Baloo 2 is used by exactly one rule (`.illdoor-wrap` in `index.css`) — the animated logo. Instrument Serif by one (`.font-instrument`).

You already have `display=swap` and both `preconnect` hints, which is the right start. Beyond that:

- Cut Inter to 400/600/700 (500 is used lightly; check before removing).
- Self-host with `@fontsource-variable/inter` — removes a third-party DNS lookup, TLS handshake, and a render-blocking stylesheet round-trip. On mobile networks in Bangladesh that is typically a few hundred milliseconds.
- Consider dropping Baloo 2 entirely and setting the logo in Inter 800.

---

### P2-11. Images cause layout shift and are oversized **[VERIFIED]**

No `<img>` in the project carries `width`/`height` attributes (checked all 8: `UserAvatar.tsx:46`, `BookCard.tsx:26`, `ImageGallery.tsx:22,48`, `BookDetailsPage.tsx:376`, `ProfilePage.tsx:254`, `SellBookPage.tsx:529`, `OrdersPage.tsx:198`). The aspect-ratio wrapper on the card helps, but intrinsic dimensions still prevent shift.

```tsx
<img src={...} width={600} height={450} loading="lazy" decoding="async" />
```

`BookCardProps` declares `priority?: boolean` (line 11) but the component destructures only `({ book })` — the prop is **verified unused**. Wire it up so the first four cards load eagerly:

```tsx
export const BookCard: React.FC<BookCardProps> = ({ book, priority = false }) => (
  // ...
  <img loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} ... />
);

// BrowsePage.tsx
{filteredBooks.map((book, i) => <BookCard key={book.id} book={book} priority={i < 4} />)}
```

In `src/lib/imageUpload.ts`: `maxWidthOrHeight: 1920` at `maxSizeMB: 0.7` is far larger than any card needs (cards render at ~300 CSS px). Drop to `1280`. And `cacheControl: '3600'` should be `'31536000'` — your storage paths are `userId/bookId/timestamp.webp`, so they are immutable and can be cached for a year.

---

<a name="p3"></a>
## P3 — Polish

- **Smooth scroll on navigation.** `window.scrollTo({ top: 0, behavior: 'smooth' })` appears in `App.tsx:44`, `BottomGlassNav.tsx:32`, and four places in `MarketplaceContext.tsx`. On mobile it animates for ~500 ms while the new page mounts, which reads as lag. Use `behavior: 'instant'` for navigation; keep `smooth` for in-page anchors.
- **`dataLoading` is exposed and consumed by nothing [VERIFIED]** — defined at `MarketplaceContext.tsx:230`, passed through the provider at line 636, and never read by any page. That is why there are no skeletons anywhere. Wire it into `BrowsePage` and `HomePage`.
- **`content-visibility` for the grid:**
  ```css
  .book-grid > * { content-visibility: auto; contain-intrinsic-size: 340px; }
  ```
- **Virtualize** past ~200 listings (`@tanstack/react-virtual`). Not needed yet.
- **Hover states on touch devices.** `BookCard.tsx:30` has `group-hover:scale-[1.03]`; on mobile this sticks after a tap. Gate behind `sm:` or `@media (hover: hover)`.
- **Add to `index.html`:** `<meta name="theme-color" content="#ededed">` and `<link rel="preconnect" href="https://YOUR-PROJECT.supabase.co">`.
- **Error boundary.** `src/lib/supabase.ts:7` throws at module scope when env vars are missing — before React mounts, so the user gets a blank white page. Render a readable message instead, and add an error boundary in `main.tsx`.
- **`key={idx}` on list items** at `OrderTimeline.tsx:137`, `ImageGallery.tsx:39`, `SellBookPage.tsx:542`, `HomePage.tsx:50`. Only `HomePage.tsx:50` is safe (a fixed-length gauge tick array). Use stable ids for the other three.
- **`Terms of Service.md` is 0 bytes.** A marketplace handling money needs real terms before launch.

---

<a name="sql"></a>
## Ready-to-apply SQL patch

Run in the Supabase SQL editor. **Note the types:** `books.id` and `pickup_points.id` are `TEXT`, not `UUID` (`schema.sql:40` and `:27`). `orders.id`, `profiles.id` and the rest are `UUID`.

```sql
-- ============================================================
-- 1. INDEXES  (P2-7)
-- ============================================================
CREATE INDEX IF NOT EXISTS books_created_at_idx   ON public.books (created_at DESC);
CREATE INDEX IF NOT EXISTS books_dept_sem_idx     ON public.books (department, semester);
CREATE INDEX IF NOT EXISTS books_availability_idx ON public.books (availability);
CREATE INDEX IF NOT EXISTS books_seller_idx       ON public.books (seller_id);
CREATE INDEX IF NOT EXISTS book_images_book_idx   ON public.book_images (book_id);
CREATE INDEX IF NOT EXISTS orders_buyer_idx       ON public.orders (buyer_id);
CREATE INDEX IF NOT EXISTS orders_seller_idx      ON public.orders (seller_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS wishlist_user_idx      ON public.wishlist (user_id);
CREATE INDEX IF NOT EXISTS disputes_reporter_idx  ON public.disputes (reported_by);

-- Full-text search (optional, for when the catalogue grows)
CREATE INDEX IF NOT EXISTS books_search_idx ON public.books
  USING gin (to_tsvector('simple', title || ' ' || author || ' ' || subject_code));

-- ============================================================
-- 2. MISSING PICKUP POINT  (P0-10)
-- ============================================================
INSERT INTO public.pickup_points (id, name, campus, location_detail, operating_hours, contact_person, phone)
VALUES ('pk-4', 'Campus Cafeteria Locker Station', 'Dhaka Polytechnic Institute',
        'Cafeteria Block, Locker Row A', 'Sun - Thu: 9:00 AM - 5:00 PM',
        'Cafeteria Manager', '+880 1700-000000')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. FIX PROFILE TRIGGER  (P0-11, P1-2)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, student_roll, institute, department, semester, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name',    'Student'),
    COALESCE(NEW.raw_user_meta_data->>'student_roll', ''),
    COALESCE(NEW.raw_user_meta_data->>'institute',    'Dhaka Polytechnic Institute'),
    COALESCE(NEW.raw_user_meta_data->>'department',   'Computer Technology'),
    COALESCE(NEW.raw_user_meta_data->>'semester',     '1st Semester'),
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. VIEW COUNTER  (P0-4)
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_book_views(p_book_id TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.books SET views_count = views_count + 1 WHERE id = p_book_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_book_views(TEXT) TO anon, authenticated;

-- ============================================================
-- 5. ATOMIC ORDER PLACEMENT  (P0-3, plus the counter race)
-- ============================================================
CREATE OR REPLACE FUNCTION public.place_order(p_book_id TEXT, p_pickup_point_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id UUID;
  v_book     public.books%ROWTYPE;
  v_pin      TEXT;
  v_num      TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- row lock closes the double-booking race
  SELECT * INTO v_book FROM public.books WHERE id = p_book_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book not found';
  END IF;
  IF v_book.availability <> 'Available' THEN
    RAISE EXCEPTION 'This book is no longer available';
  END IF;
  IF v_book.seller_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot buy your own listing';
  END IF;

  v_pin := lpad((floor(random() * 9000) + 1000)::TEXT, 4, '0');
  v_num := 'PB-' || lpad((floor(random() * 900000) + 100000)::TEXT, 6, '0');

  INSERT INTO public.orders (
    order_number, book_id, buyer_id, seller_id, price,
    status, pickup_point_id, payment_state, verification_pin
  ) VALUES (
    v_num, p_book_id, auth.uid(), v_book.seller_id, v_book.selling_price,
    'placed', p_pickup_point_id, 'Paid (Escrow)', v_pin
  )
  RETURNING id INTO v_order_id;

  UPDATE public.books SET availability = 'Reserved' WHERE id = p_book_id;

  -- server-side counter, no read-modify-write race
  UPDATE public.profiles SET total_purchases = total_purchases + 1 WHERE id = auth.uid();

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_order(TEXT, TEXT) TO authenticated;

-- ============================================================
-- 6. SERVER-SIDE PIN VERIFICATION  (P1-1)
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_pickup_pin(p_order_id UUID, p_pin TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Order not found.');
  END IF;

  -- only the SELLER should be able to release escrow by entering the buyer's PIN
  IF auth.uid() <> v_order.seller_id THEN
    RETURN json_build_object('success', false, 'message', 'Only the seller can confirm handover.');
  END IF;

  IF v_order.status = 'completed' THEN
    RETURN json_build_object('success', false, 'message', 'This order is already completed.');
  END IF;

  IF v_order.verification_pin IS DISTINCT FROM btrim(p_pin) THEN
    RETURN json_build_object('success', false, 'message', 'Invalid PIN.');
  END IF;

  UPDATE public.orders
     SET status = 'completed', payment_state = 'Released to Seller'
   WHERE id = p_order_id;

  UPDATE public.books SET availability = 'Sold' WHERE id = v_order.book_id;
  UPDATE public.profiles SET total_sales = total_sales + 1 WHERE id = v_order.seller_id;

  RETURN json_build_object('success', true, 'message', 'PIN verified. Escrow released.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_pickup_pin(UUID, TEXT) TO authenticated;

-- ============================================================
-- 7. LOCK DOWN DIRECT ORDER UPDATES  (P1-1)
-- ============================================================
DROP POLICY IF EXISTS "orders_update_participants" ON public.orders;

-- participants may only cancel a not-yet-completed order; everything else
-- (completion, escrow release) must go through verify_pickup_pin
CREATE POLICY "orders_cancel_participants" ON public.orders
  FOR UPDATE
  USING  (auth.uid() IN (buyer_id, seller_id) AND status IN ('placed', 'confirmed'))
  WITH CHECK (auth.uid() IN (buyer_id, seller_id) AND status = 'cancelled');

-- ============================================================
-- 8. SCOPE THE STORAGE INSERT POLICY  (P1-3)
-- ============================================================
DROP POLICY IF EXISTS "book_covers_insert_auth" ON storage.objects;

CREATE POLICY "book_covers_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'book-covers'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );
```

**Before running:** back up, and be aware that step 7 changes behaviour — if any part of your UI currently moves an order to `confirmed` / `dropped_off` / `ready_for_pickup`, add matching RPCs for those transitions or the buttons will stop working. Check `OrdersPage.tsx` and `AdminDashboard.tsx` for direct `orders` updates before you apply it.

---

<a name="code"></a>
## Ready-to-apply client changes

Replace `createOrder` and `verifyPickupPin` in `MarketplaceContext.tsx`:

```ts
const createOrder = useCallback(async (bookId: string, pickupPointId: string) => {
  if (!user) return { orderId: '', error: 'Please log in first.' };

  const { data, error } = await supabase.rpc('place_order', {
    p_book_id: bookId,
    p_pickup_point_id: pickupPointId,
  });

  if (error) return { orderId: '', error: error.message };

  await Promise.all([refreshBooks(), refreshOrders(), refreshNotifications()]);
  return { orderId: data as string, error: null };
}, [user, refreshBooks, refreshOrders, refreshNotifications]);


const verifyPickupPin = useCallback(async (orderId: string, pin: string) => {
  const { data, error } = await supabase.rpc('verify_pickup_pin', {
    p_order_id: orderId,
    p_pin: pin.trim(),
  });

  if (error) return { success: false, message: error.message };

  await Promise.all([refreshOrders(), refreshBooks()]);
  return data as { success: boolean; message: string };
}, [refreshOrders, refreshBooks]);
```

`createOrder` now returns `{ orderId, error }` instead of a bare string — update its type in `MarketplaceContextType` and its call site in `BookDetailsPage.tsx`, and **show the error** rather than dropping it.

And in `navigateToBook`:

```ts
void supabase.rpc('increment_book_views', { p_book_id: bookId });
```

---

<a name="order"></a>
## Suggested work order

| # | Item | Why now | Rough effort |
|---|---|---|---|
| 1 | **P1-1** escrow RPC + policy | A buyer can release escrow without collecting the book | 2h |
| 2 | **P0-1** images never save | Every real listing shows "No Image" | 2h |
| 3 | **P0-2** mock-data fallback | "Buy Now" is a dead button on a fresh DB | 1h |
| 4 | **P0-3/4** `place_order` + `increment_book_views` | Fixes reserve failure, double-booking, counter race | 2h |
| 5 | **P0-7** stuck signup, **P0-9** dead animations | Two one-line-ish fixes, both highly visible | 1h |
| 6 | **P0-5/6** order joins | Orders show the wrong people, and vanish | 2h |
| 7 | **P0-8/10/11** sort, pickup point, phone | Correctness cleanup | 1h |
| 8 | **P2-1** auth context, **P2-2** memoize, **P2-3** slider | The main render-performance work | 3h |
| 9 | **P2-4/5/6** code-split, drop `motion`, drop dead deps | ~40% smaller initial bundle | 2h |
| 10 | **P2-7/8** indexes, waterfall, pagination | Backend latency | 2h |
| 11 | **P2-9** glass/animation cost — *profile first* | Mobile scroll smoothness | 2h |
| 12 | **P2-10/11** fonts, images | First-paint and CLS | 2h |

Items 1–7 are correctness and security. Do not ship to real students before finishing them. 8–12 are speed.

---

<a name="measure"></a>
## How to measure (don't trust this document, or me)

Set a baseline before you change anything:

```bash
npm ci
npm run build
npx vite-bundle-visualizer          # see what's actually in the 738 KB
npm run preview
```

Then in Chrome DevTools, on the preview build:

1. **Lighthouse** → Mobile → Performance. Record LCP, TBT, CLS. Re-run after each batch.
2. **Performance panel** → 6× CPU throttle → record while scrolling the Browse page with ~24 cards. This is the test for [P2-9](#p2-9): if "Paint" and "Composite Layers" dominate the flame chart, the glass theory is right. If it's "Scripting", then [P2-2](#p2-2) and [P2-3](#p2-3) are your real problem — fix those first and leave the visual design alone.
3. **Rendering panel** → tick *Paint flashing* and *Layer borders*. Drag the price slider and watch how much of the screen repaints.
4. **React DevTools Profiler** → tick *Highlight updates when components render*. Drag the slider. Before [P2-2](#p2-2) every card should flash; after, none should.
5. **Network panel** → Slow 4G → hard reload. Count the requests before first contentful paint. That number should drop when you fix [P2-1](#p2-1).

For the database, run `EXPLAIN ANALYZE` on the books query in the Supabase SQL editor before and after adding indexes. On a small table Postgres may correctly prefer a sequential scan and the indexes will look useless — that's expected; they pay off as rows accumulate.

---

## Summary of what changed from my earlier advice

Two corrections I owe you, both from re-checking source:

1. **I told you to debounce the search input. That was wrong.** `SearchBar.tsx:19` already holds the value in local state and only commits on submit. The genuine hot path is the **price slider** ([P2-3](#p2-3)), which I had missed.
2. **My first `place_order` RPC used `uuid` parameters.** `books.id` and `pickup_points.id` are `TEXT`. The version in this document is corrected.

And five bugs found only on the second pass: [P0-1](#p0-1) (images never save — the biggest one), [P0-9](#p0-9) (dead animation classes), [P0-10](#p0-10) (pickup point silently reassigned), [P0-11](#p0-11) (phone dropped), and the slider `max`/default mismatch in [P2-3](#p2-3).
