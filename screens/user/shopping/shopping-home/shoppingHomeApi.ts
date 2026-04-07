// ============================================
// Shopping Home — API Layer
// ============================================

import { USE_SHOPPING_DUMMY_DATA } from '../../../../networks/shopping/config';
import type { BrandConfig, Product, Category } from '../../../../models/shopping/types';

// ── Banner Type ─────────────────────────────

export interface HomeBanner {
  bannerId: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  gradientColors: string[];
  ctaText: string;
  ctaRoute: string;
  ctaParams?: Record<string, string>;
}

export interface HomeFeedData {
  banners: HomeBanner[];
  featuredBrands: BrandConfig[];
  featuredProducts: Product[];
  categories: Category[];
}

// ── Dummy Data ──────────────────────────────

const DUMMY_BANNERS: HomeBanner[] = [
  {
    bannerId: 'b1',
    title: 'Summer Sale',
    subtitle: 'Up to 50% off on fashion & lifestyle',
    imageUrl: '',
    gradientColors: ['#6C5CE7', '#A29BFE'],
    ctaText: 'Shop Now',
    ctaRoute: 'ProductList',
    ctaParams: { brandId: 'brand-1' },
  },
  {
    bannerId: 'b2',
    title: 'New Arrivals',
    subtitle: 'Fresh drops from top Pakistani brands',
    imageUrl: '',
    gradientColors: ['#E67E22', '#F39C12'],
    ctaText: 'Explore',
    ctaRoute: 'ProductList',
    ctaParams: { brandId: 'brand-2' },
  },
  {
    bannerId: 'b3',
    title: 'Free Delivery',
    subtitle: 'Orders above Rs. 2,000 ship free',
    imageUrl: '',
    gradientColors: ['#00B894', '#55EFC4'],
    ctaText: 'Order Now',
    ctaRoute: 'ProductList',
    ctaParams: { brandId: 'brand-3' },
  },
  {
    bannerId: 'b4',
    title: 'Flash Deals',
    subtitle: 'Limited time offers — ends tonight!',
    imageUrl: '',
    gradientColors: ['#E17055', '#FDCB6E'],
    ctaText: 'Hurry Up',
    ctaRoute: 'ProductList',
    ctaParams: { brandId: 'brand-1' },
  },
];

const DUMMY_BRANDS: BrandConfig[] = [
  {
    brandId: 'brand-1',
    odexId: 'od-1',
    name: 'Sapphire',
    slug: 'sapphire',
    tagline: 'Crafting Elegance',
    logo: '',
    bannerImage: '',
    primaryColor: '#1B4332',
    secondaryColor: '#2D6A4F',
    accentColor: '#52B788',
    categories: [],
    policies: { returnDays: 14, shippingInfo: 'Free delivery above Rs. 3,000', paymentMethods: ['cod', 'card', 'jazzcash'] },
    contactEmail: 'hello@sapphire.pk',
    contactPhone: '+92-300-1234567',
    website: 'https://sapphire.pk',
    socialLinks: { instagram: '@sapphirepk', facebook: 'sapphirepk' },
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    brandId: 'brand-2',
    odexId: 'od-2',
    name: 'Khaadi',
    slug: 'khaadi',
    tagline: 'Weaving Dreams',
    logo: '',
    bannerImage: '',
    primaryColor: '#8D6E63',
    secondaryColor: '#6D4C41',
    accentColor: '#D7CCC8',
    categories: [],
    policies: { returnDays: 7, shippingInfo: 'Standard 3–5 days', paymentMethods: ['cod', 'card', 'easypaisa'] },
    contactEmail: 'info@khaadi.com',
    contactPhone: '+92-311-2345678',
    website: 'https://khaadi.com',
    socialLinks: { instagram: '@khaadi', facebook: 'khaadi' },
    isActive: true,
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    brandId: 'brand-3',
    odexId: 'od-3',
    name: 'Gul Ahmed',
    slug: 'gul-ahmed',
    tagline: 'Ideas that Inspire',
    logo: '',
    bannerImage: '',
    primaryColor: '#283593',
    secondaryColor: '#1A237E',
    accentColor: '#5C6BC0',
    categories: [],
    policies: { returnDays: 10, shippingInfo: 'Free delivery above Rs. 2,000', paymentMethods: ['cod', 'card', 'jazzcash', 'easypaisa'] },
    contactEmail: 'care@gulahmed.com',
    contactPhone: '+92-321-3456789',
    website: 'https://gulahmed.com',
    socialLinks: { instagram: '@gulahmedshop', facebook: 'gulahmed' },
    isActive: true,
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    brandId: 'brand-4',
    odexId: 'od-4',
    name: 'Junaid Jamshed',
    slug: 'junaid-jamshed',
    tagline: 'Style with Tradition',
    logo: '',
    bannerImage: '',
    primaryColor: '#4A148C',
    secondaryColor: '#6A1B9A',
    accentColor: '#CE93D8',
    categories: [],
    policies: { returnDays: 7, shippingInfo: 'Standard 2–4 days', paymentMethods: ['cod', 'card'] },
    contactEmail: 'support@junaidjamshed.com',
    contactPhone: '+92-333-4567890',
    website: 'https://junaidjamshed.com',
    socialLinks: { instagram: '@junaidjamshed', facebook: 'junaidjamshed' },
    isActive: true,
    createdAt: '2024-03-01T00:00:00Z',
  },
  {
    brandId: 'brand-5',
    odexId: 'od-5',
    name: 'Ethnic',
    slug: 'ethnic',
    tagline: 'Where Fashion Meets Culture',
    logo: '',
    bannerImage: '',
    primaryColor: '#BF360C',
    secondaryColor: '#D84315',
    accentColor: '#FF8A65',
    categories: [],
    policies: { returnDays: 14, shippingInfo: 'Express 1–2 days available', paymentMethods: ['cod', 'card', 'bank_transfer'] },
    contactEmail: 'hello@ethnic.pk',
    contactPhone: '+92-345-5678901',
    website: 'https://ethnic.pk',
    socialLinks: { instagram: '@ethnicpk' },
    isActive: true,
    createdAt: '2024-04-01T00:00:00Z',
  },
];

const DUMMY_CATEGORIES: Category[] = [
  { categoryId: 'cat-1', brandId: '', name: 'Women', slug: 'women', icon: 'woman', image: '', description: 'Women\'s fashion', productCount: 342, sortOrder: 1, isActive: true },
  { categoryId: 'cat-2', brandId: '', name: 'Men', slug: 'men', icon: 'man', image: '', description: 'Men\'s fashion', productCount: 218, sortOrder: 2, isActive: true },
  { categoryId: 'cat-3', brandId: '', name: 'Kids', slug: 'kids', icon: 'happy', image: '', description: 'Kids\' collection', productCount: 145, sortOrder: 3, isActive: true },
  { categoryId: 'cat-4', brandId: '', name: 'Accessories', slug: 'accessories', icon: 'watch', image: '', description: 'Bags, shoes & more', productCount: 89, sortOrder: 4, isActive: true },
  { categoryId: 'cat-5', brandId: '', name: 'Home', slug: 'home', icon: 'home', image: '', description: 'Home décor & living', productCount: 167, sortOrder: 5, isActive: true },
  { categoryId: 'cat-6', brandId: '', name: 'Beauty', slug: 'beauty', icon: 'sparkles', image: '', description: 'Skincare & makeup', productCount: 203, sortOrder: 6, isActive: true },
];

const DUMMY_PRODUCTS: Product[] = [
  {
    productId: 'p1', odexId: 'op1', brandId: 'brand-1', sku: 'SPH-001',
    name: 'Embroidered Lawn Suit', description: 'Premium unstitched 3-piece lawn suit',
    images: [], categoryId: 'cat-1', variants: [],
    basePrice: 5490, salePrice: 3990, rating: 4.6, totalReviews: 128,
    isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['lawn', 'summer', 'sale'], createdAt: '2024-06-01T00:00:00Z',
  },
  {
    productId: 'p2', odexId: 'op2', brandId: 'brand-2', sku: 'KH-002',
    name: 'Printed Silk Dupatta', description: 'Hand-finished silk dupatta',
    images: [], categoryId: 'cat-1', variants: [],
    basePrice: 3200, rating: 4.8, totalReviews: 89,
    isFeatured: true, isNewArrival: true, inStock: true,
    tags: ['silk', 'dupatta', 'new'], createdAt: '2024-06-10T00:00:00Z',
  },
  {
    productId: 'p3', odexId: 'op3', brandId: 'brand-3', sku: 'GA-003',
    name: 'Men\'s Kameez Shalwar', description: 'Wash & wear fabric — wrinkle free',
    images: [], categoryId: 'cat-2', variants: [],
    basePrice: 4500, salePrice: 3600, rating: 4.3, totalReviews: 64,
    isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['men', 'shalwar-kameez', 'sale'], createdAt: '2024-05-20T00:00:00Z',
  },
  {
    productId: 'p4', odexId: 'op4', brandId: 'brand-4', sku: 'JJ-004',
    name: 'Kurta Collection', description: 'Ready-to-wear premium kurta',
    images: [], categoryId: 'cat-2', variants: [],
    basePrice: 6800, rating: 4.7, totalReviews: 112,
    isFeatured: true, isNewArrival: true, inStock: true,
    tags: ['kurta', 'premium', 'new'], createdAt: '2024-06-15T00:00:00Z',
  },
  {
    productId: 'p5', odexId: 'op5', brandId: 'brand-5', sku: 'ET-005',
    name: 'Kids Party Wear', description: 'Festive collection for little ones',
    images: [], categoryId: 'cat-3', variants: [],
    basePrice: 3990, salePrice: 2990, rating: 4.5, totalReviews: 43,
    isFeatured: false, isNewArrival: true, inStock: true,
    tags: ['kids', 'party', 'sale'], createdAt: '2024-06-08T00:00:00Z',
  },
  {
    productId: 'p6', odexId: 'op6', brandId: 'brand-1', sku: 'SPH-006',
    name: 'Leather Crossbody Bag', description: 'Genuine leather — everyday luxury',
    images: [], categoryId: 'cat-4', variants: [],
    basePrice: 7500, rating: 4.9, totalReviews: 76,
    isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['bag', 'leather', 'accessories'], createdAt: '2024-04-01T00:00:00Z',
  },
];

// ── API Function ────────────────────────────

export async function fetchShoppingHomeFeed(): Promise<HomeFeedData> {
  if (USE_SHOPPING_DUMMY_DATA) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      banners: DUMMY_BANNERS,
      featuredBrands: DUMMY_BRANDS,
      featuredProducts: DUMMY_PRODUCTS,
      categories: DUMMY_CATEGORIES,
    };
  }

  // Real API call would go here
  const response = await fetch('https://metromatrix-api-3445ddd9bd3a.herokuapp.com/api/shopping/home');
  if (!response.ok) throw new Error('Failed to fetch home feed');
  return response.json();
}
