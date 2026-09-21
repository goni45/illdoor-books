import { supabase } from './supabase';

const BUCKET_NAME = 'student-id-cards';

export async function uploadStudentIdCard(file: File, userId: string): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Storage bucket upload error, trying fallback bucket:', uploadError);
      // Try alternate bucket name if student-id-cards does not exist
      const { error: fallbackError } = await supabase.storage
        .from('student-ids')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (fallbackError) {
        console.error('All storage upload attempts failed:', fallbackError);
        return null;
      }
      return `student-ids/${fileName}`;
    }

    return `${BUCKET_NAME}/${fileName}`;
  } catch (err) {
    console.error('Failed to upload student ID card:', err);
    return null;
  }
}

export async function getStudentIdSignedUrl(path: string): Promise<string | null> {
  try {
    let bucket = BUCKET_NAME;
    let filePath = path;

    if (path.startsWith(`${BUCKET_NAME}/`)) {
      filePath = path.replace(`${BUCKET_NAME}/`, '');
    } else if (path.startsWith('student-ids/')) {
      bucket = 'student-ids';
      filePath = path.replace('student-ids/', '');
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600);

    if (error || !data?.signedUrl) {
      // If signed url fails, try public url
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return publicData?.publicUrl || null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Failed to get signed URL:', err);
    return null;
  }
}
