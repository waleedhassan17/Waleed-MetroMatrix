// ============================================
// Brand List — API Layer
// ============================================

import { USE_SHOPPING_DUMMY_DATA } from '../../../../networks/shopping/config';
import type { BrandConfig } from '../../../../models/shopping/types';

// ── Extended Brand with extra display fields ─

export interface BrandListItem extends BrandConfig {
  productCount: number;
  avgRating: number;
}

export interface BrandListParams {
  search?: string;
  category?: string;
  sortBy?: 'az' | 'rating' | 'newest' | 'products';
  page?: number;
  limit?: number;
}

export interface BrandListResponse {
  brands: BrandListItem[];
  total: number;
  page: number;
  hasMore: boolean;
}

// ── Dummy Data ──────────────────────────────

const ALL_BRANDS: BrandListItem[] = [
  {
    brandId: 'brand-1', odexId: 'od-1', name: 'Sapphire', slug: 'sapphire',
    tagline: 'Crafting Elegance', logo: '', bannerImage: '',
    primaryColor: '#1B4332', secondaryColor: '#2D6A4F', accentColor: '#52B788',
    categories: [], policies: { returnDays: 14, shippingInfo: 'Free above Rs. 3,000', paymentMethods: ['cod', 'card', 'jazzcash'] },
    contactEmail: 'hello@sapphire.pk', contactPhone: '+92-300-1234567',
    website: 'https://sapphire.pk', socialLinks: { instagram: '@sapphirepk' },
    isActive: true, createdAt: '2024-01-10T00:00:00Z',
    productCount: 342, avgRating: 4.7,
  },
  {
    brandId: 'brand-2', odexId: 'od-2', name: 'Khaadi', slug: 'khaadi',
    tagline: 'Weaving Dreams', logo: '', bannerImage: '',
    primaryColor: '#8D6E63', secondaryColor: '#6D4C41', accentColor: '#D7CCC8',
    categories: [], policies: { returnDays: 7, shippingInfo: 'Standard 3–5 days', paymentMethods: ['cod', 'card', 'easypaisa'] },
    contactEmail: 'info@khaadi.com', contactPhone: '+92-311-2345678',
    website: 'https://khaadi.com', socialLinks: { instagram: '@khaadi' },
    isActive: true, createdAt: '2024-02-05T00:00:00Z',
    productCount: 518, avgRating: 4.5,
  },
  {
    brandId: 'brand-3', odexId: 'od-3', name: 'Gul Ahmed', slug: 'gul-ahmed',
    tagline: 'Ideas that Inspire', logo: '', bannerImage: '',
    primaryColor: '#283593', secondaryColor: '#1A237E', accentColor: '#5C6BC0',
    categories: [], policies: { returnDays: 10, shippingInfo: 'Free above Rs. 2,000', paymentMethods: ['cod', 'card', 'jazzcash', 'easypaisa'] },
    contactEmail: 'care@gulahmed.com', contactPhone: '+92-321-3456789',
    website: 'https://gulahmed.com', socialLinks: { instagram: '@gulahmedshop' },
    isActive: true, createdAt: '2024-01-20T00:00:00Z',
    productCount: 620, avgRating: 4.6,
  },
  {
    brandId: 'brand-4', odexId: 'od-4', name: 'Junaid Jamshed', slug: 'junaid-jamshed',
    tagline: 'Style with Tradition', logo: '', bannerImage: '',
    primaryColor: '#4A148C', secondaryColor: '#6A1B9A', accentColor: '#CE93D8',
    categories: [], policies: { returnDays: 7, shippingInfo: 'Standard 2–4 days', paymentMethods: ['cod', 'card'] },
    contactEmail: 'support@junaidjamshed.com', contactPhone: '+92-333-4567890',
    website: 'https://junaidjamshed.com', socialLinks: { instagram: '@junaidjamshed' },
    isActive: true, createdAt: '2024-03-12T00:00:00Z',
    productCount: 410, avgRating: 4.4,
  },
  {
    brandId: 'brand-5', odexId: 'od-5', name: 'Ethnic', slug: 'ethnic',
    tagline: 'Where Fashion Meets Culture', logo: '', bannerImage: '',
    primaryColor: '#BF360C', secondaryColor: '#D84315', accentColor: '#FF8A65',
    categories: [], policies: { returnDays: 14, shippingInfo: 'Express 1–2 days', paymentMethods: ['cod', 'card', 'bank_transfer'] },
    contactEmail: 'hello@ethnic.pk', contactPhone: '+92-345-5678901',
    website: 'https://ethnic.pk', socialLinks: { instagram: '@ethnicpk' },
    isActive: true, createdAt: '2024-04-08T00:00:00Z',
    productCount: 185, avgRating: 4.3,
  },
  {
    brandId: 'brand-6', odexId: 'od-6', name: 'Bonanza Satrangi', slug: 'bonanza',
    tagline: 'Colours of Pakistan', logo: '', bannerImage: '',
    primaryColor: '#E65100', secondaryColor: '#F57C00', accentColor: '#FFB74D',
    categories: [], policies: { returnDays: 10, shippingInfo: 'Free above Rs. 4,000', paymentMethods: ['cod', 'card'] },
    contactEmail: 'info@bonanzagl.com', contactPhone: '+92-300-6789012',
    website: 'https://bonanza.pk', socialLinks: { instagram: '@bonanzasatrangi' },
    isActive: true, createdAt: '2024-02-15T00:00:00Z',
    productCount: 290, avgRating: 4.2,
  },
  {
    brandId: 'brand-7', odexId: 'od-7', name: 'Alkaram Studio', slug: 'alkaram',
    tagline: 'Designing the Future', logo: '', bannerImage: '',
    primaryColor: '#00695C', secondaryColor: '#004D40', accentColor: '#4DB6AC',
    categories: [], policies: { returnDays: 14, shippingInfo: 'Free above Rs. 2,500', paymentMethods: ['cod', 'card', 'jazzcash'] },
    contactEmail: 'care@alkaramstudio.com', contactPhone: '+92-312-7890123',
    website: 'https://alkaramstudio.com', socialLinks: { instagram: '@alkaramstudio' },
    isActive: true, createdAt: '2024-01-30T00:00:00Z',
    productCount: 475, avgRating: 4.5,
  },
  {
    brandId: 'brand-8', odexId: 'od-8', name: 'Nishat Linen', slug: 'nishat',
    tagline: 'Quality in Every Thread', logo: '', bannerImage: '',
    primaryColor: '#1565C0', secondaryColor: '#0D47A1', accentColor: '#64B5F6',
    categories: [], policies: { returnDays: 7, shippingInfo: 'Standard 3–5 days', paymentMethods: ['cod', 'card', 'easypaisa'] },
    contactEmail: 'hello@nishatlinen.com', contactPhone: '+92-321-8901234',
    website: 'https://nishatlinen.com', socialLinks: { instagram: '@nishat_linen' },
    isActive: true, createdAt: '2024-03-01T00:00:00Z',
    productCount: 380, avgRating: 4.4,
  },
  {
    brandId: 'brand-9', odexId: 'od-9', name: 'Edenrobe', slug: 'edenrobe',
    tagline: 'Dress to Impress', logo: '', bannerImage: '',
    primaryColor: '#37474F', secondaryColor: '#263238', accentColor: '#78909C',
    categories: [], policies: { returnDays: 14, shippingInfo: 'Free above Rs. 3,500', paymentMethods: ['cod', 'card'] },
    contactEmail: 'info@edenrobe.com', contactPhone: '+92-334-9012345',
    website: 'https://edenrobe.com', socialLinks: { instagram: '@edenrobe' },
    isActive: true, createdAt: '2024-04-20T00:00:00Z',
    productCount: 260, avgRating: 4.3,
  },
  {
    brandId: 'brand-10', odexId: 'od-10', name: 'Limelight', slug: 'limelight',
    tagline: 'Shine Your Way', logo: '', bannerImage: '',
    primaryColor: '#AD1457', secondaryColor: '#880E4F', accentColor: '#F48FB1',
    categories: [], policies: { returnDays: 10, shippingInfo: 'Standard 3–5 days', paymentMethods: ['cod', 'card', 'jazzcash'] },
    contactEmail: 'hello@limelight.pk', contactPhone: '+92-300-0123456',
    website: 'https://limelight.pk', socialLinks: { instagram: '@limelightpk' },
    isActive: true, createdAt: '2024-05-01T00:00:00Z',
    productCount: 310, avgRating: 4.6,
  },
];

// ── Category tags for brands (simulated) ────

const BRAND_CATEGORIES: Record<string, string[]> = {
  'brand-1': ['Women', 'Men', 'Kids'],
  'brand-2': ['Women', 'Home'],
  'brand-3': ['Women', 'Men', 'Kids', 'Home'],
  'brand-4': ['Men', 'Women', 'Kids'],
  'brand-5': ['Women'],
  'brand-6': ['Women', 'Men'],
  'brand-7': ['Women', 'Men', 'Kids'],
  'brand-8': ['Women', 'Home'],
  'brand-9': ['Men', 'Kids'],
  'brand-10': ['Women'],
};

// ── Fetch Logic ─────────────────────────────

export async function fetchBrandList(params: BrandListParams = {}): Promise<BrandListResponse> {
  if (USE_SHOPPING_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 600));

    let filtered = [...ALL_BRANDS];

    // Search filter
    if (params.search && params.search.trim().length > 0) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.tagline.toLowerCase().includes(q) ||
          b.slug.toLowerCase().includes(q),
      );
    }

    // Category filter
    if (params.category && params.category !== 'All') {
      filtered = filtered.filter((b) => {
        const cats = BRAND_CATEGORIES[b.brandId] || [];
        return cats.includes(params.category!);
      });
    }

    // Sort
    switch (params.sortBy) {
      case 'az':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'rating':
        filtered.sort((a, b) => b.avgRating - a.avgRating);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'products':
        filtered.sort((a, b) => b.productCount - a.productCount);
        break;
      default:
        // Default = rating
        filtered.sort((a, b) => b.avgRating - a.avgRating);
    }

    // Pagination
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);

    return {
      brands: paged,
      total: filtered.length,
      page,
      hasMore: start + limit < filtered.length,
    };
  }

  // Real API call
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.category) qs.set('category', params.category);
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));

  const res = await fetch(
    `https://metromatrix-api-3445ddd9bd3a.herokuapp.com/api/shopping/brands?${qs.toString()}`,
  );
  if (!res.ok) throw new Error('Failed to fetch brands');
  return res.json();
}
