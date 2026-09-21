import { BookListing, Publication, PublicationEdition } from '../types';

export const COVER_PLACEHOLDER =
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80';

export function getPublicationCover(
  book?: {
    coverImage?: string;
    commonCoverImageUrl?: string;
    images?: string[];
    publicationEditions?: PublicationEdition[];
  } | null,
  publication?: Publication | string
): string {
  if (!book) return COVER_PLACEHOLDER;

  if (publication && book.publicationEditions && book.publicationEditions.length > 0) {
    const matched = book.publicationEditions.find(
      (entry) => entry.publication?.toLowerCase() === publication?.toLowerCase()
    );
    if (matched?.coverImageUrl) {
      return matched.coverImageUrl;
    }
  }

  if (book.commonCoverImageUrl) return book.commonCoverImageUrl;
  if (book.coverImage) return book.coverImage;
  if (book.images && book.images.length > 0 && book.images[0]) return book.images[0];

  return COVER_PLACEHOLDER;
}
