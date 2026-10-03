import type { ConsoleMeta } from '../../../networks/admin/adminApi';

/** A service category's name from /admin/meta; an unknown slug is spelled out, not hidden. */
export function categoryLabel(meta: ConsoleMeta | undefined, slug: string | null | undefined): string {
  if (!slug) return 'Service';
  const match = (meta?.serviceCategories as { slug?: string; name?: string }[] | undefined)?.find((c) => c.slug === slug);
  if (match?.name) return match.name;
  const words = slug.replace(/[-_]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : slug;
}
