// ============================================
// Brand Store — API Layer
// ============================================

import { USE_SHOPPING_DUMMY_DATA } from '../../../../networks/shopping/config';
import type { BrandConfig, Product, Category } from '../../../../models/shopping/types';

export interface BrandStoreData {
  brand: BrandConfig;
  categories: Category[];
  featuredProducts: Product[];
}

export interface BrandProductsParams {
  brandId: string;
  categoryId?: string;
  sortBy?: 'relevance' | 'price_low' | 'price_high' | 'rating' | 'newest';
  page?: number;
  limit?: number;
}

export interface BrandProductsResponse {
  products: Product[];
  total: number;
  page: number;
  hasMore: boolean;
}

// ── Dummy Brands ────────────────────────────

const BRANDS_DB: Record<string, BrandConfig> = {
  'brand-1': {
    brandId: 'brand-1', odexId: 'od-1', name: 'Sapphire', slug: 'sapphire',
    tagline: 'Crafting Elegance', logo: '', bannerImage: '',
    primaryColor: '#1B4332', secondaryColor: '#2D6A4F', accentColor: '#52B788',
    categories: [], policies: { returnDays: 14, shippingInfo: 'Free delivery above Rs. 3,000', paymentMethods: ['cod', 'card', 'jazzcash'] },
    contactEmail: 'hello@sapphire.pk', contactPhone: '+92-300-1234567',
    website: 'https://sapphire.pk', socialLinks: { instagram: '@sapphirepk', facebook: 'sapphirepk' },
    isActive: true, createdAt: '2024-01-10T00:00:00Z',
  },
  'brand-2': {
    brandId: 'brand-2', odexId: 'od-2', name: 'Khaadi', slug: 'khaadi',
    tagline: 'Weaving Dreams', logo: '', bannerImage: '',
    primaryColor: '#8D6E63', secondaryColor: '#6D4C41', accentColor: '#D7CCC8',
    categories: [], policies: { returnDays: 7, shippingInfo: 'Standard 3–5 days', paymentMethods: ['cod', 'card', 'easypaisa'] },
    contactEmail: 'info@khaadi.com', contactPhone: '+92-311-2345678',
    website: 'https://khaadi.com', socialLinks: { instagram: '@khaadi' },
    isActive: true, createdAt: '2024-02-05T00:00:00Z',
  },
  'brand-3': {
    brandId: 'brand-3', odexId: 'od-3', name: 'Gul Ahmed', slug: 'gul-ahmed',
    tagline: 'Ideas that Inspire', logo: '', bannerImage: '',
    primaryColor: '#283593', secondaryColor: '#1A237E', accentColor: '#5C6BC0',
    categories: [], policies: { returnDays: 10, shippingInfo: 'Free delivery above Rs. 2,000', paymentMethods: ['cod', 'card', 'jazzcash', 'easypaisa'] },
    contactEmail: 'care@gulahmed.com', contactPhone: '+92-321-3456789',
    website: 'https://gulahmed.com', socialLinks: { instagram: '@gulahmedshop' },
    isActive: true, createdAt: '2024-01-20T00:00:00Z',
  },
  'brand-4': {
    brandId: 'brand-4', odexId: 'od-4', name: 'Junaid Jamshed', slug: 'junaid-jamshed',
    tagline: 'Style with Tradition', logo: '', bannerImage: '',
    primaryColor: '#4A148C', secondaryColor: '#6A1B9A', accentColor: '#CE93D8',
    categories: [], policies: { returnDays: 7, shippingInfo: 'Standard 2–4 days', paymentMethods: ['cod', 'card'] },
    contactEmail: 'support@junaidjamshed.com', contactPhone: '+92-333-4567890',
    website: 'https://junaidjamshed.com', socialLinks: { instagram: '@junaidjamshed' },
    isActive: true, createdAt: '2024-03-12T00:00:00Z',
  },
  'brand-5': {
    brandId: 'brand-5', odexId: 'od-5', name: 'Ethnic', slug: 'ethnic',
    tagline: 'Where Fashion Meets Culture', logo: '', bannerImage: '',
    primaryColor: '#BF360C', secondaryColor: '#D84315', accentColor: '#FF8A65',
    categories: [], policies: { returnDays: 14, shippingInfo: 'Express 1–2 days', paymentMethods: ['cod', 'card', 'bank_transfer'] },
    contactEmail: 'hello@ethnic.pk', contactPhone: '+92-345-5678901',
    website: 'https://ethnic.pk', socialLinks: { instagram: '@ethnicpk' },
    isActive: true, createdAt: '2024-04-08T00:00:00Z',
  },
};

const BRAND_CATEGORIES: Record<string, Category[]> = {
  'brand-1': [
    { categoryId: 'c1-1', brandId: 'brand-1', name: 'Unstitched', slug: 'unstitched', icon: 'cut', image: '', description: 'Unstitched fabrics', productCount: 85, sortOrder: 1, isActive: true },
    { categoryId: 'c1-2', brandId: 'brand-1', name: 'Ready to Wear', slug: 'rtw', icon: 'shirt', image: '', description: 'Stitched & ready', productCount: 120, sortOrder: 2, isActive: true },
    { categoryId: 'c1-3', brandId: 'brand-1', name: 'Accessories', slug: 'accessories', icon: 'watch', image: '', description: 'Bags, shoes & more', productCount: 45, sortOrder: 3, isActive: true },
    { categoryId: 'c1-4', brandId: 'brand-1', name: 'Men', slug: 'men', icon: 'man', image: '', description: 'Men\'s collection', productCount: 60, sortOrder: 4, isActive: true },
  ],
  'brand-2': [
    { categoryId: 'c2-1', brandId: 'brand-2', name: 'Lawn', slug: 'lawn', icon: 'leaf', image: '', description: 'Summer lawns', productCount: 95, sortOrder: 1, isActive: true },
    { categoryId: 'c2-2', brandId: 'brand-2', name: 'Pret', slug: 'pret', icon: 'shirt', image: '', description: 'Ready to wear', productCount: 140, sortOrder: 2, isActive: true },
    { categoryId: 'c2-3', brandId: 'brand-2', name: 'Home', slug: 'home', icon: 'home', image: '', description: 'Home textiles', productCount: 70, sortOrder: 3, isActive: true },
  ],
};

// Default categories for brands without specific ones
const DEFAULT_CATEGORIES: Category[] = [
  { categoryId: 'def-1', brandId: '', name: 'New Arrivals', slug: 'new', icon: 'sparkles', image: '', description: 'Latest drops', productCount: 30, sortOrder: 1, isActive: true },
  { categoryId: 'def-2', brandId: '', name: 'Best Sellers', slug: 'best', icon: 'trending-up', image: '', description: 'Top picks', productCount: 50, sortOrder: 2, isActive: true },
  { categoryId: 'def-3', brandId: '', name: 'Sale', slug: 'sale', icon: 'pricetag', image: '', description: 'Discounted items', productCount: 25, sortOrder: 3, isActive: true },
];

// ── Brand Products Factory ──────────────────

function generateBrandProducts(brandId: string, count: number = 12): Product[] {
  const brand = BRANDS_DB[brandId];
  if (!brand) return [];

  const names = [
    'Embroidered Lawn Suit', 'Printed Silk Dupatta', 'Cotton Kurta', 'Chiffon Dress',
    'Linen Trouser', 'Organza Suit', 'Cambric Collection', 'Jacquard Ensemble',
    'Khaddar Winter Wear', 'Festive Formal', 'Basic Tee', 'Casual Pret',
    'Evening Gown', 'Bridal Collection', 'Summer Casual', 'Premium Kurta Set',
  ];

  return Array.from({ length: count }, (_, i) => {
    const basePrice = 2000 + Math.floor(Math.random() * 8000);
    const hasSale = Math.random() > 0.5;
    return {
      productId: `${brandId}-p${i + 1}`,
      odexId: `op-${brandId}-${i + 1}`,
      brandId,
      sku: `${brand.slug.toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
      name: names[i % names.length],
      description: `Premium ${names[i % names.length].toLowerCase()} from ${brand.name}`,
      images: [],
      categoryId: (BRAND_CATEGORIES[brandId] || DEFAULT_CATEGORIES)[i % (BRAND_CATEGORIES[brandId] || DEFAULT_CATEGORIES).length].categoryId,
      variants: [],
      basePrice,
      salePrice: hasSale ? Math.round(basePrice * (0.6 + Math.random() * 0.2)) : undefined,
      rating: 3.5 + Math.random() * 1.5,
      totalReviews: 5 + Math.floor(Math.random() * 200),
      isFeatured: i < 4,
      isNewArrival: i >= count - 3,
      inStock: Math.random() > 0.1,
      tags: [brand.slug, 'fashion'],
      createdAt: new Date(2024, 5, 1 + i).toISOString(),
    };
  });
}

// ── API Functions ───────────────────────────

export async function fetchBrandStoreData(brandId: string): Promise<BrandStoreData> {
  if (USE_SHOPPING_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 700));
    const brand = BRANDS_DB[brandId];
    if (!brand) throw new Error('Brand not found');
    const categories = BRAND_CATEGORIES[brandId] || DEFAULT_CATEGORIES.map((c) => ({ ...c, brandId }));
    const featuredProducts = generateBrandProducts(brandId, 6).filter((p) => p.isFeatured);
    return { brand, categories, featuredProducts };
  }
  const res = await fetch(`https://metromatrix-api-3445ddd9bd3a.herokuapp.com/api/shopping/brands/${brandId}`);
  if (!res.ok) throw new Error('Failed to load brand');
  return res.json();
}

export async function fetchBrandProducts(params: BrandProductsParams): Promise<BrandProductsResponse> {
  if (USE_SHOPPING_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 500));
    let products = generateBrandProducts(params.brandId, 16);

    if (params.categoryId) {
      products = products.filter((p) => p.categoryId === params.categoryId);
    }

    switch (params.sortBy) {
      case 'price_low': products.sort((a, b) => (a.salePrice ?? a.basePrice) - (b.salePrice ?? b.basePrice)); break;
      case 'price_high': products.sort((a, b) => (b.salePrice ?? b.basePrice) - (a.salePrice ?? a.basePrice)); break;
      case 'rating': products.sort((a, b) => b.rating - a.rating); break;
      case 'newest': products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const start = (page - 1) * limit;
    const paged = products.slice(start, start + limit);
    return { products: paged, total: products.length, page, hasMore: start + limit < products.length };
  }
  const qs = new URLSearchParams({ brandId: params.brandId });
  if (params.categoryId) qs.set('category', params.categoryId);
  if (params.sortBy) qs.set('sort', params.sortBy);
  if (params.page) qs.set('page', String(params.page));
  const res = await fetch(`https://metromatrix-api-3445ddd9bd3a.herokuapp.com/api/shopping/products?${qs}`);
  if (!res.ok) throw new Error('Failed to load products');
  return res.json();
}
