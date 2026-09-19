import imageCompression from 'browser-image-compression';
import { supabase } from './supabase';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1280,
  useWebWorker: true,
  fileType: 'image/webp',
};

/**
 * Compress and upload a book image to Supabase Storage.
 * Returns the public URL of the uploaded image.
 */
export async function uploadBookImage(
  file: File,
  userId: string,
  bookId: string
): Promise<string> {
  // 1. Compress
  let fileToUpload: File = file;
  try {
    const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
    fileToUpload = new File([compressed], file.name.replace(/\.[^.]+$/, '.webp'), {
      type: 'image/webp',
    });
  } catch (err) {
    console.warn('Image compression failed, uploading original:', err);
  }

  // 2. Build storage path: userId/bookId/timestamp.webp
  const timestamp = Date.now();
  const storagePath = `${userId}/${bookId}/${timestamp}.webp`;

  // 3. Upload to Supabase Storage
  const { error } = await supabase.storage
    .from('book-covers')
    .upload(storagePath, fileToUpload, {
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  // 4. Get public URL
  const { data } = supabase.storage.from('book-covers').getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Upload multiple images and return all public URLs.
 */
export async function uploadBookImages(
  files: File[],
  userId: string,
  bookId: string
): Promise<string[]> {
  const uploads = files.map((file) => uploadBookImage(file, userId, bookId));
  return Promise.all(uploads);
}

/**
 * Compress and upload a student ID card into the PRIVATE `student-ids` bucket.
 * Returns the storage path (not a public URL — only the owner and admins can read it).
 */
export async function uploadStudentIdCard(file: File, userId: string): Promise<string> {
  let fileToUpload: File = file;
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
      fileType: 'image/webp',
    });
    fileToUpload = new File([compressed], file.name.replace(/\.[^.]+$/, '.webp'), {
      type: 'image/webp',
    });
  } catch (err) {
    console.warn('ID card compression failed, uploading original:', err);
  }

  const storagePath = `${userId}/id-card-${Date.now()}.webp`;

  const { error } = await supabase.storage
    .from('student-ids')
    .upload(storagePath, fileToUpload, { cacheControl: '3600', upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  return storagePath;
}

/** Short-lived signed URL so an admin can inspect a private ID card photo. */
export async function getStudentIdSignedUrl(
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage.from('student-ids').createSignedUrl(path, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Delete a book image from storage by its public URL.
 */
export async function deleteBookImage(publicUrl: string): Promise<void> {
  const url = new URL(publicUrl);
  // Extract storage path from URL
  const pathParts = url.pathname.split('/book-covers/');
  if (pathParts.length < 2) return;
  const storagePath = pathParts[1];
  await supabase.storage.from('book-covers').remove([storagePath]);
}
