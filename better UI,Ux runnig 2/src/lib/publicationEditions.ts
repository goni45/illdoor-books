import type { BookListing, Publication, PublicationEdition } from '../types';

export const COVER_PLACEHOLDER = 'https://placehold.co/600x800/f3f4f6/9ca3af?text=Cover+Coming+Soon';

export function getPublicationEdition(
  book: Pick<BookListing, 'publicationEditions'>,
  publication: Publication | undefined,
): PublicationEdition | undefined {
  if (!publication) return undefined;
  return book.publicationEditions?.find((edition) => edition.publication === publication);
}

export function getPublicationCover(
  book: Pick<BookListing, 'publicationEditions' | 'images' | 'commonCoverImageUrl'>,
  publication: Publication | undefined,
): string {
  return getPublicationEdition(book, publication)?.coverImageUrl || book.commonCoverImageUrl || book.images[0] || COVER_PLACEHOLDER;
}

export function hasPublicationCover(
  book: Pick<BookListing, 'publicationEditions'>,
  publication: Publication | undefined,
): boolean {
  return Boolean(getPublicationEdition(book, publication)?.coverImageUrl);
}
