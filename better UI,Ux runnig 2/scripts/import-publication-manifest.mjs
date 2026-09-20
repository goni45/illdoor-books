import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error('Usage: npm run import:publication-manifest -- path/to/manifest.json');
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!supabaseUrl || !serviceRoleKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your local shell. Never commit or share the service-role key.');
  process.exit(1);
}

const allowedPublications = new Set(['Haque Publication', 'Technical Publication']);
const copyCovers = process.env.COPY_COVERS_TO_STORAGE === 'true';
const approvedHosts = new Set(
  (process.env.APPROVED_IMAGE_HOSTS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
const bucket = process.env.BOOK_COVER_BUCKET || 'book-covers';
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (!Array.isArray(manifest)) throw new Error('Manifest root must be an array.');

async function ensureBucket() {
  if (!copyCovers) return;
  const { data } = await supabase.storage.getBucket(bucket);
  if (!data) {
    const { error } = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
    if (error && !error.message.toLowerCase().includes('already exists')) throw error;
  }
}

function normalizeUrl(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const url = new URL(text);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`Unsupported URL protocol: ${text}`);
  return url;
}

async function storeApprovedCover(entry, sourceUrl) {
  if (!sourceUrl || !copyCovers) return sourceUrl?.toString() || null;
  if (approvedHosts.size === 0 || !approvedHosts.has(sourceUrl.hostname.toLowerCase())) {
    throw new Error(`Cover host is not approved: ${sourceUrl.hostname}. Set APPROVED_IMAGE_HOSTS only after confirming reuse permission.`);
  }
  const response = await fetch(sourceUrl, { headers: { 'User-Agent': 'IlldoorCatalogImporter/1.0' } });
  if (!response.ok) throw new Error(`Cover download failed (${response.status}): ${sourceUrl}`);
  const contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const extension = extensions[contentType];
  if (!extension) throw new Error(`Unsupported cover content type: ${contentType}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error(`Cover is larger than 5 MB: ${sourceUrl}`);
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const publicationSlug = entry.publication === 'Haque Publication' ? 'haque' : 'technical';
  const objectPath = `${publicationSlug}/${entry.subjectCode}-${hash}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(objectPath, bytes, {
    contentType,
    cacheControl: '31536000',
    upsert: true,
  });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
}

await ensureBucket();
let imported = 0;
let skipped = 0;
const errors = [];

for (const raw of manifest) {
  try {
    const subjectCode = String(raw.subjectCode || '').trim();
    const publication = String(raw.publication || '').trim();
    if (!subjectCode) throw new Error('subjectCode is required');
    if (!allowedPublications.has(publication)) throw new Error(`Invalid publication: ${publication}`);

    const { data: models, error: modelError } = await supabase
      .from('books')
      .select('id,title,subject_code')
      .eq('subject_code', subjectCode)
      .limit(2);
    if (modelError) throw modelError;
    if (!models?.length) {
      skipped += 1;
      errors.push(`${subjectCode}: no matching Book Model`);
      continue;
    }
    if (models.length > 1) throw new Error('Multiple Book Models use this subject code');

    const remoteCover = normalizeUrl(raw.coverImageUrl);
    const sourceUrl = normalizeUrl(raw.sourceUrl);
    const coverImageUrl = await storeApprovedCover({ subjectCode, publication }, remoteCover);
    const referencePrice = raw.referencePrice == null || raw.referencePrice === '' ? null : Number(raw.referencePrice);
    if (referencePrice != null && (!Number.isFinite(referencePrice) || referencePrice < 0)) throw new Error('Invalid referencePrice');

    const { error: upsertError } = await supabase
      .from('book_publication_editions')
      .upsert({
        book_id: models[0].id,
        publication,
        cover_image_url: coverImageUrl,
        source_url: sourceUrl?.toString() || null,
        source_product_id: String(raw.sourceProductId || '').trim() || null,
        author_override: String(raw.author || '').trim() || null,
        edition_label: String(raw.edition || '').trim() || null,
        reference_price: referencePrice,
        last_synced_at: sourceUrl ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'book_id,publication' });
    if (upsertError) throw upsertError;
    imported += 1;
    console.log(`Imported ${subjectCode} — ${publication}`);
  } catch (error) {
    errors.push(`${raw?.subjectCode || 'unknown'}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(JSON.stringify({ imported, skipped, failed: errors.length }, null, 2));
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 2;
}
