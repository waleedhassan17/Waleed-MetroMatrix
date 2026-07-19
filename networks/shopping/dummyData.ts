// ============================================
// Shopping Module - Centralized Dummy Data
// This file provides offline-ready mock data for all
// shopping views (User, Brand Provider, Admin).
// Replace with real API calls when backend is ready.
// ============================================

import type {
  BrandConfig,
  Category,
  Product,
  ProductVariant,
  ProductReview,
  Order,
  OrderItem,
  Coupon,
  PaginatedResponse,
  SingleResponse,
} from '../../types/shopping';

// ── Outfitters Brand ────────────────────────────

export const OUTFITTERS_BRAND: BrandConfig = {
  brandId: 'brand_outfitters_001',
  odexId: 'ODX-OUT-001',
  name: 'Cougar',
  slug: 'cougar',
  description: 'Pakistan\'s leading fashion retail brand offering trendy clothing for men, women, and kids. Known for quality basics, streetwear, and seasonal collections.',
  tagline: 'Urban Fashion',
  logo: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=200&h=200&fit=crop',
  bannerImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop',
  primaryColor: '#1A1A2E',
  secondaryColor: '#16213E',
  accentColor: '#E94560',
  categories: ['fashion', 'clothing', 'accessories'],
  policies: {
    returnDays: 15,
    shippingInfo: 'Free shipping on orders above PKR 3,000. Standard delivery in 3-5 business days.',
    paymentMethods: ['COD', 'Credit Card', 'Debit Card', 'JazzCash', 'Easypaisa'],
  },
  contactEmail: 'support@outfitters.com.pk',
  contactPhone: '+92-42-111-688-348',
  website: 'https://www.outfitters.com.pk',
  socialLinks: {
    facebook: 'https://facebook.com/outfitterspk',
    instagram: 'https://instagram.com/outfitters',
    twitter: 'https://twitter.com/outfitterspk',
  },
  isActive: true,
  createdAt: '2024-01-15T00:00:00.000Z',
};

// ── Categories ──────────────────────────────────

export const OUTFITTERS_CATEGORIES: Category[] = [
  {
    categoryId: 'cat_men',
    name: 'Men',
    slug: 'men',
    icon: '👔',
    children: [
      { categoryId: 'cat_men_tshirts', name: 'T-Shirts', slug: 'men-tshirts', icon: '👕', children: [], productCount: 24 },
      { categoryId: 'cat_men_jeans', name: 'Jeans', slug: 'men-jeans', icon: '👖', children: [], productCount: 18 },
      { categoryId: 'cat_men_shirts', name: 'Shirts', slug: 'men-shirts', icon: '👔', children: [], productCount: 15 },
      { categoryId: 'cat_men_jackets', name: 'Jackets', slug: 'men-jackets', icon: '🧥', children: [], productCount: 12 },
      { categoryId: 'cat_men_shoes', name: 'Shoes', slug: 'men-shoes', icon: '👟', children: [], productCount: 20 },
    ],
    productCount: 89,
  },
  {
    categoryId: 'cat_women',
    name: 'Women',
    slug: 'women',
    icon: '👗',
    children: [
      { categoryId: 'cat_women_tops', name: 'Tops', slug: 'women-tops', icon: '👚', children: [], productCount: 22 },
      { categoryId: 'cat_women_jeans', name: 'Jeans', slug: 'women-jeans', icon: '👖', children: [], productCount: 16 },
      { categoryId: 'cat_women_dresses', name: 'Dresses', slug: 'women-dresses', icon: '👗', children: [], productCount: 14 },
      { categoryId: 'cat_women_bags', name: 'Bags', slug: 'women-bags', icon: '👜', children: [], productCount: 10 },
    ],
    productCount: 62,
  },
  {
    categoryId: 'cat_kids',
    name: 'Kids',
    slug: 'kids',
    icon: '🧒',
    children: [
      { categoryId: 'cat_kids_boys', name: 'Boys', slug: 'kids-boys', icon: '👦', children: [], productCount: 18 },
      { categoryId: 'cat_kids_girls', name: 'Girls', slug: 'kids-girls', icon: '👧', children: [], productCount: 15 },
    ],
    productCount: 33,
  },
  {
    categoryId: 'cat_accessories',
    name: 'Accessories',
    slug: 'accessories',
    icon: '🎒',
    children: [
      { categoryId: 'cat_acc_watches', name: 'Watches', slug: 'accessories-watches', icon: '⌚', children: [], productCount: 8 },
      { categoryId: 'cat_acc_sunglasses', name: 'Sunglasses', slug: 'accessories-sunglasses', icon: '🕶️', children: [], productCount: 6 },
      { categoryId: 'cat_acc_bags', name: 'Bags & Backpacks', slug: 'accessories-bags', icon: '🎒', children: [], productCount: 10 },
    ],
    productCount: 24,
  },
  {
    categoryId: 'cat_footwear',
    name: 'Footwear',
    slug: 'footwear',
    icon: '👟',
    children: [
      { categoryId: 'cat_foot_sneakers', name: 'Sneakers', slug: 'footwear-sneakers', icon: '👟', children: [], productCount: 14 },
      { categoryId: 'cat_foot_sandals', name: 'Sandals', slug: 'footwear-sandals', icon: '🩴', children: [], productCount: 8 },
    ],
    productCount: 22,
  },
];

// ── Products ────────────────────────────────────

const generateVariants = (sizes: string[], colors: { name: string; code: string }[]): ProductVariant[] => {
  const variants: ProductVariant[] = [];
  let idx = 0;
  colors.forEach((color) => {
    sizes.forEach((size) => {
      idx++;
      variants.push({
        variantId: `var_${idx}_${size}_${color.name.toLowerCase().replace(/\s/g, '')}`,
        size,
        color: color.name,
        colorCode: color.code,
        additionalPrice: 0,
        stockQuantity: Math.floor(Math.random() * 30) + 5,
        sku: `OUT-${size}-${color.name.substring(0, 3).toUpperCase()}-${idx}`,
      });
    });
  });
  return variants;
};

export const OUTFITTERS_PRODUCTS: Product[] = [
  // ── Men's T-Shirts ────────────────────────
  {
    productId: 'prod_001',
    odexId: 'ODX-P-001',
    brandId: 'brand_outfitters_001',
    sku: 'OUT-TS-001',
    name: 'Essential Crew Neck T-Shirt',
    description: 'A wardrobe staple. This classic crew neck t-shirt is crafted from premium 100% combed cotton for exceptional softness and breathability. Perfect for everyday wear.',
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1503341504253-dff4f76c4790?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&h=800&fit=crop',
    ],
    categoryId: 'cat_men_tshirts',
    variants: generateVariants(['S', 'M', 'L', 'XL'], [{ name: 'Black', code: '#000000' }, { name: 'White', code: '#FFFFFF' }, { name: 'Navy', code: '#1B2838' }]),
    basePrice: 1490,
    salePrice: 1190,
    rating: 4.5,
    totalReviews: 128,
    isFeatured: true,
    isNewArrival: false,
    inStock: true,
    tags: ['basics', 'cotton', 'crew-neck', 'men'],
    createdAt: '2024-08-15T00:00:00.000Z',
  },
  {
    productId: 'prod_002',
    odexId: 'ODX-P-002',
    brandId: 'brand_outfitters_001',
    sku: 'OUT-TS-002',
    name: 'Graphic Print Oversized Tee',
    description: 'Stand out with this oversized graphic tee. Features a bold streetwear-inspired print on heavyweight cotton. Drop shoulder design for that relaxed silhouette.',
    images: [
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=800&fit=crop',
    ],
    categoryId: 'cat_men_tshirts',
    variants: generateVariants(['M', 'L', 'XL', 'XXL'], [{ name: 'Charcoal', code: '#36454F' }, { name: 'Olive', code: '#556B2F' }]),
    basePrice: 2290,
    salePrice: undefined,
    rating: 4.7,
    totalReviews: 86,
    isFeatured: true,
    isNewArrival: true,
    inStock: true,
    tags: ['graphic', 'oversized', 'streetwear', 'men'],
    createdAt: '2024-11-01T00:00:00.000Z',
  },
  {
    productId: 'prod_003',
    odexId: 'ODX-P-003',
    brandId: 'brand_outfitters_001',
    sku: 'OUT-TS-003',
    name: 'Polo Slim Fit',
    description: 'Elevate your casual look with this slim-fit polo. Made from piqué cotton with a ribbed collar and two-button placket. Great for smart-casual occasions.',
    images: [
      'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1625910513413-5fc42f006e6c?w=600&h=800&fit=crop',
    ],
    categoryId: 'cat_men_tshirts',
    variants: generateVariants(['S', 'M', 'L', 'XL'], [{ name: 'Burgundy', code: '#800020' }, { name: 'Forest Green', code: '#228B22' }, { name: 'White', code: '#FFFFFF' }]),
    basePrice: 2690,
    salePrice: 2290,
    rating: 4.3,
    totalReviews: 52,
    isFeatured: false,
    isNewArrival: false,
    inStock: true,
    tags: ['polo', 'slim-fit', 'smart-casual', 'men'],
    createdAt: '2024-09-20T00:00:00.000Z',
  },
  // ── Men's Jeans ────────────────────────
  {
    productId: 'prod_004',
    odexId: 'ODX-P-004',
    brandId: 'brand_outfitters_001',
    sku: 'OUT-JN-001',
    name: 'Slim Fit Stretch Denim',
    description: 'Our best-selling slim fit jeans with added stretch for maximum comfort. Made from premium indigo denim with a modern tapered leg. 2% elastane for all-day flex.',
    images: [
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=600&h=800&fit=crop',
    ],
    categoryId: 'cat_men_jeans',
    variants: generateVariants(['30', '32', '34', '36'], [{ name: 'Dark Indigo', code: '#091F5B' }, { name: 'Mid Blue', code: '#4169E1' }, { name: 'Black', code: '#000000' }]),
    basePrice: 3990,
    salePrice: 3490,
    rating: 4.6,
    totalReviews: 204,
    isFeatured: true,
    isNewArrival: false,
    inStock: true,
    tags: ['jeans', 'slim-fit', 'stretch', 'denim', 'men'],
    createdAt: '2024-07-10T00:00:00.000Z',
  },
  {
    productId: 'prod_005',
    odexId: 'ODX-P-005',
    brandId: 'brand_outfitters_001',
    sku: 'OUT-JN-002',
    name: 'Relaxed Baggy Jeans',
    description: 'Embrace the relaxed fit trend with these baggy jeans. Wide leg design with a comfortable high waist. Washed finish for a vintage look.',
    images: [
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=600&h=800&fit=crop',
    ],
    categoryId: 'cat_men_jeans',
    variants: generateVariants(['30', '32', '34', '36'], [{ name: 'Light Wash', code: '#B0C4DE' }, { name: 'Stone', code: '#8B8682' }]),
    basePrice: 4490,
    salePrice: undefined,
    rating: 4.4,
    totalReviews: 67,
    isFeatured: false,
    isNewArrival: true,
    inStock: true,
    tags: ['jeans', 'baggy', 'relaxed', 'wide-leg', 'men'],
    createdAt: '2024-11-15T00:00:00.000Z',
  },
  // ── Men's Jackets ─────────────────────
  {
    productId: 'prod_006',
    odexId: 'ODX-P-006',
    brandId: 'brand_outfitters_001',
    sku: 'OUT-JK-001',
    name: 'Puffer Jacket - Winter Essential',
    description: 'Stay warm in style with this lightweight puffer jacket. Water-resistant outer shell with synthetic insulation. Features a detachable hood and multiple pockets.',
    images: [
      'https://images.unsplash.com/photo-1544923246-77307dd270b4?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=600&h=800&fit=crop',
    ],
    categoryId: 'cat_men_jackets',
    variants: generateVariants(['M', 'L', 'XL'], [{ name: 'Black', code: '#000000' }, { name: 'Navy', code: '#1B2838' }, { name: 'Khaki', code: '#C3B091' }]),
    basePrice: 7990,
    salePrice: 5990,
    rating: 4.8,
    totalReviews: 156,
    isFeatured: true,
    isNewArrival: false,
    inStock: true,
    tags: ['jacket', 'puffer', 'winter', 'outerwear', 'men'],
    createdAt: '2024-10-01T00:00:00.000Z',
  },
  // ── Women's Tops ──────────────────────
  {
    productId: 'prod_007',
    odexId: 'ODX-P-007',
    brandId: 'brand_outfitters_001',
    sku: 'OUT-WT-001',
    name: 'Ribbed Crop Top',
    description: 'A versatile ribbed crop top in soft stretch fabric. Features a flattering slim fit and crew neckline. Layer it or wear alone for effortless style.',
    images: [
      'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600&h=800&fit=crop',
    ],
    categoryId: 'cat_women_tops',
    variants: generateVariants(['XS', 'S', 'M', 'L'], [{ name: 'Blush Pink', code: '#F4C2C2' }, { name: 'Black', code: '#000000' }, { name: 'Cream', code: '#FFFDD0' }]),
    basePrice: 1690,
    salePrice: 1290,
    rating: 4.6,
    totalReviews: 94,
    isFeatured: true,
    isNewArrival: false,
    inStock: true,
    tags: ['crop-top', 'ribbed', 'basics', 'women'],
    createdAt: '2024-09-01T00:00:00.000Z',
  },
  {
    productId: 'prod_008',
    odexId: 'ODX-P-008',
    brandId: 'brand_outfitters_001',
    sku: 'OUT-WT-002',
    name: 'Oversized Hoodie - Women',
    description: 'Cozy oversized hoodie made from brushed fleece. Features a kangaroo pocket and adjustable drawstring hood. Perfect for lounging or layering.',
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1578681994506-b8f463449011?w=600&h=800&fit=crop',
    ],
    categoryId: 'cat_women_tops',
    variants: generateVariants(['S', 'M', 'L', 'XL'], [{ name: 'Lavender', code: '#E6E6FA' }, { name: 'Sage', code: '#9DC183' }, { name: 'Grey', code: '#808080' }]),
    basePrice: 3490,
    salePrice: undefined,
    rating: 4.8,
    totalReviews: 142,
    isFeatured: true,
    isNewArrival: true,
    inStock: true,
    tags: ['hoodie', 'oversized', 'fleece', 'women'],
    createdAt: '2024-11-10T00:00:00.000Z',
  },
  // ── Women's Dresses ───────────────────
  {
    productId: 'prod_009',
    odexId: 'ODX-P-009',
    brandId: 'brand_outfitters_001',
    sku: 'OUT-WD-001',
    name: 'Floral Midi Dress',
    description: 'A beautiful floral print midi dress with a flattering A-line silhouette. Features puff sleeves, a v-neckline, and a self-tie waist belt.',
    images: [
      'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=600&h=800&fit=crop',
    ],
    categoryId: 'cat_women_dresses',
    variants: generateVariants(['XS', 'S', 'M', 'L'], [{ name: 'Floral Blue', code: '#6495ED' }, { name: 'Floral Pink', code: '#FFB6C1' }]),
    basePrice: 4990,
    salePrice: 3990,
    rating: 4.7,
    totalReviews: 78,
    isFeatured: false,
    isNewArrival: true,
    inStock: true,
    tags: ['dress', 'midi', 'floral', 'a-line', 'women'],
    createdAt: '2024-10-20T00:00:00.000Z',
  },
  // ── Kids ──────────────────────────────
  {
    productId: 'prod_010',
    odexId: 'ODX-P-010',
    brandId: 'brand_outfitters_001',
    sku: 'OUT-KD-001',
    name: 'Kids Graphic Tee - Dinosaur',
    description: 'Fun and playful graphic t-shirt for boys. Made from soft organic cotton with a cool dinosaur print. Machine washable and pre-shrunk.',
    images: [
      'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=600&h=800&fit=crop',
    ],
    categoryId: 'cat_kids_boys',
    variants: generateVariants(['4-5Y', '6-7Y', '8-9Y', '10-11Y'], [{ name: 'Sky Blue', code: '#87CEEB' }, { name: 'Green', code: '#32CD32' }]),
    basePrice: 990,
    salePrice: 790,
    rating: 4.9,
    totalReviews: 63,
    isFeatured: true,
    isNewArrival: false,
    inStock: true,
    tags: ['kids', 'boys', 'graphic', 'organic-cotton'],
    createdAt: '2024-08-01T00:00:00.000Z',
  },
  // ── Accessories ───────────────────────
  {
    productId: 'prod_011',
    odexId: 'ODX-P-011',
    brandId: 'brand_outfitters_001',
    sku: 'OUT-AC-001',
    name: 'Canvas Backpack - Urban',
    description: 'A durable canvas backpack with multiple compartments. Features a padded laptop sleeve (fits 15"), water bottle pockets, and adjustable straps.',
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1581605405669-fcdf81165b55?w=600&h=800&fit=crop',
    ],
    categoryId: 'cat_acc_bags',
    variants: generateVariants(['One Size'], [{ name: 'Black', code: '#000000' }, { name: 'Tan', code: '#D2B48C' }, { name: 'Olive', code: '#556B2F' }]),
    basePrice: 3490,
    salePrice: 2790,
    rating: 4.5,
    totalReviews: 89,
    isFeatured: true,
    isNewArrival: false,
    inStock: true,
    tags: ['backpack', 'canvas', 'urban', 'accessories'],
    createdAt: '2024-06-15T00:00:00.000Z',
  },
  // ── Footwear ──────────────────────────
  {
    productId: 'prod_012',
    odexId: 'ODX-P-012',
    brandId: 'brand_outfitters_001',
    sku: 'OUT-FW-001',
    name: 'Retro Sneakers - White',
    description: 'Classic retro-inspired sneakers with a clean white leather upper. Cushioned insole for all-day comfort. Rubber outsole for durability.',
    images: [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=800&fit=crop',
    ],
    categoryId: 'cat_foot_sneakers',
    variants: generateVariants(['7', '8', '9', '10', '11'], [{ name: 'White', code: '#FFFFFF' }, { name: 'White/Green', code: '#F0FFF0' }]),
    basePrice: 5490,
    salePrice: 4490,
    rating: 4.7,
    totalReviews: 178,
    isFeatured: true,
    isNewArrival: false,
    inStock: true,
    tags: ['sneakers', 'retro', 'white', 'leather', 'footwear'],
    createdAt: '2024-05-01T00:00:00.000Z',
  },
  // ── Additional products ───────────────
  {
    productId: 'prod_013',
    odexId: 'ODX-P-013',
    brandId: 'brand_outfitters_001',
    sku: 'OUT-MS-001',
    name: 'Oxford Button-Down Shirt',
    description: 'Classic Oxford cloth button-down shirt. Tailored regular fit with a soft collar and chest pocket. Essential for smart-casual layering.',
    images: [
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&h=800&fit=crop',
    ],
    categoryId: 'cat_men_shirts',
    variants: generateVariants(['S', 'M', 'L', 'XL'], [{ name: 'Light Blue', code: '#ADD8E6' }, { name: 'White', code: '#FFFFFF' }, { name: 'Pink', code: '#FFB6C1' }]),
    basePrice: 3290,
    salePrice: undefined,
    rating: 4.4,
    totalReviews: 72,
    isFeatured: false,
    isNewArrival: false,
    inStock: true,
    tags: ['shirt', 'oxford', 'button-down', 'smart-casual', 'men'],
    createdAt: '2024-07-25T00:00:00.000Z',
  },
  {
    productId: 'prod_014',
    odexId: 'ODX-P-014',
    brandId: 'brand_outfitters_001',
    sku: 'OUT-WJ-001',
    name: 'High Waist Skinny Jeans - Women',
    description: 'Figure-flattering high waist skinny jeans with super stretch denim. Sleek silhouette that goes from day to night effortlessly.',
    images: [
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1475178626620-a4d074967571?w=600&h=800&fit=crop',
    ],
    categoryId: 'cat_women_jeans',
    variants: generateVariants(['26', '28', '30', '32'], [{ name: 'Black', code: '#000000' }, { name: 'Dark Blue', code: '#00008B' }]),
    basePrice: 3790,
    salePrice: 2990,
    rating: 4.5,
    totalReviews: 116,
    isFeatured: true,
    isNewArrival: false,
    inStock: true,
    tags: ['jeans', 'skinny', 'high-waist', 'stretch', 'women'],
    createdAt: '2024-08-10T00:00:00.000Z',
  },
  {
    productId: 'prod_015',
    odexId: 'ODX-P-015',
    brandId: 'brand_outfitters_001',
    sku: 'OUT-AC-002',
    name: 'Classic Aviator Sunglasses',
    description: 'Timeless aviator sunglasses with UV400 protection. Metal frame with polarized lenses. Comes with a branded hard case.',
    images: [
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=800&fit=crop',
    ],
    categoryId: 'cat_acc_sunglasses',
    variants: generateVariants(['One Size'], [{ name: 'Gold/Green', code: '#FFD700' }, { name: 'Silver/Blue', code: '#C0C0C0' }, { name: 'Black', code: '#000000' }]),
    basePrice: 2490,
    salePrice: undefined,
    rating: 4.3,
    totalReviews: 45,
    isFeatured: false,
    isNewArrival: true,
    inStock: true,
    tags: ['sunglasses', 'aviator', 'polarized', 'accessories'],
    createdAt: '2024-11-05T00:00:00.000Z',
  },
  {
    productId: 'prod_016',
    odexId: 'ODX-P-016',
    brandId: 'brand_outfitters_001',
    sku: 'OUT-KG-001',
    name: 'Girls Floral Frock',
    description: 'Adorable floral print frock for girls. Lightweight cotton fabric with a twirl-worthy flared skirt and short puff sleeves.',
    images: [
      'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&h=800&fit=crop',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=800&fit=crop',
    ],
    categoryId: 'cat_kids_girls',
    variants: generateVariants(['3-4Y', '5-6Y', '7-8Y', '9-10Y'], [{ name: 'Pink Floral', code: '#FF69B4' }, { name: 'Yellow Floral', code: '#FFD700' }]),
    basePrice: 1290,
    salePrice: 990,
    rating: 4.8,
    totalReviews: 38,
    isFeatured: false,
    isNewArrival: true,
    inStock: true,
    tags: ['kids', 'girls', 'frock', 'floral', 'cotton'],
    createdAt: '2024-10-15T00:00:00.000Z',
  },
];

// ── Reviews ─────────────────────────────────────

export const PRODUCT_REVIEWS: ProductReview[] = [
  { reviewId: 'rev_001', productId: 'prod_001', userId: 'usr_001', userName: 'Ali Hassan', rating: 5, title: 'Perfect fit!', comment: 'Great quality cotton. Fits perfectly, very comfortable for daily wear.', isVerifiedPurchase: true, createdAt: '2024-09-15T10:30:00.000Z' },
  { reviewId: 'rev_002', productId: 'prod_001', userId: 'usr_002', userName: 'Sarah Khan', rating: 4, title: 'Good basics', comment: 'Nice quality for the price. Washed well after multiple uses.', isVerifiedPurchase: true, createdAt: '2024-09-20T14:00:00.000Z' },
  { reviewId: 'rev_003', productId: 'prod_004', userId: 'usr_003', userName: 'Ahmed Raza', rating: 5, title: 'Best jeans ever', comment: 'The stretch denim is so comfortable! I bought 3 pairs.', isVerifiedPurchase: true, createdAt: '2024-08-25T09:15:00.000Z' },
  { reviewId: 'rev_004', productId: 'prod_006', userId: 'usr_004', userName: 'Fatima Malik', rating: 5, title: 'Super warm', comment: 'Bought for winter and it is amazing. Lightweight yet very warm.', isVerifiedPurchase: true, createdAt: '2024-11-20T16:45:00.000Z' },
  { reviewId: 'rev_005', productId: 'prod_012', userId: 'usr_005', userName: 'Usman Ali', rating: 4, title: 'Clean look', comment: 'Love the retro design. Very comfortable for walking. Only downside is they get dirty quickly since they are white.', isVerifiedPurchase: true, createdAt: '2024-06-10T11:00:00.000Z' },
  { reviewId: 'rev_006', productId: 'prod_002', userId: 'usr_006', userName: 'Zainab Tariq', rating: 5, title: 'Unique design', comment: 'The graphic print is fire! Got so many compliments.', isVerifiedPurchase: true, createdAt: '2024-11-18T13:30:00.000Z' },
  { reviewId: 'rev_007', productId: 'prod_007', userId: 'usr_007', userName: 'Aisha Noor', rating: 4, title: 'Nice crop top', comment: 'Soft fabric and nice color. Slightly see-through in white though.', isVerifiedPurchase: true, createdAt: '2024-09-28T10:00:00.000Z' },
  { reviewId: 'rev_008', productId: 'prod_008', userId: 'usr_008', userName: 'Hira Shah', rating: 5, title: 'So cozy!', comment: 'This hoodie is my new favorite. Brushed fleece inside is heavenly.', isVerifiedPurchase: true, createdAt: '2024-11-25T15:20:00.000Z' },
];

// ── Coupons ─────────────────────────────────────

export const OUTFITTERS_COUPONS: Coupon[] = [
  { couponCode: 'WELCOME10', brandId: 'brand_outfitters_001', type: 'percentage', value: 10, minOrderAmount: 2000, maxDiscount: 500, validFrom: '2024-01-01T00:00:00.000Z', validUntil: '2025-12-31T23:59:59.000Z', usageLimit: 1000, usedCount: 342 },
  { couponCode: 'WINTER25', brandId: 'brand_outfitters_001', type: 'percentage', value: 25, minOrderAmount: 5000, maxDiscount: 2000, validFrom: '2024-11-01T00:00:00.000Z', validUntil: '2025-02-28T23:59:59.000Z', usageLimit: 500, usedCount: 128 },
  { couponCode: 'FLAT500', brandId: 'brand_outfitters_001', type: 'fixed', value: 500, minOrderAmount: 3000, maxDiscount: 500, validFrom: '2024-06-01T00:00:00.000Z', validUntil: '2025-06-30T23:59:59.000Z', usageLimit: 2000, usedCount: 891 },
];

// ── Orders (for Brand Provider View) ────────────

export const SAMPLE_ORDERS: Order[] = [
  {
    orderId: 'ORD-2024-001',
    odexId: 'ODX-O-001',
    userId: 'usr_001',
    brandId: 'brand_outfitters_001',
    items: [
      { itemId: 'oi_001', productId: 'prod_001', brandId: 'brand_outfitters_001', variantId: 'var_1_M_black', productName: 'Essential Crew Neck T-Shirt', productImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200', variantLabel: 'M / Black', quantity: 2, unitPrice: 1190, totalPrice: 2380 },
      { itemId: 'oi_002', productId: 'prod_004', brandId: 'brand_outfitters_001', variantId: 'var_1_32_darkindigo', productName: 'Slim Fit Stretch Denim', productImage: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=200', variantLabel: '32 / Dark Indigo', quantity: 1, unitPrice: 3490, totalPrice: 3490 },
    ],
    shippingAddress: { fullName: 'Ali Hassan', phone: '+92-300-1234567', addressLine1: 'House 5, Street 12', city: 'Lahore', state: 'Punjab', postalCode: '54000', country: 'Pakistan' },
    paymentMethod: 'COD',
    paymentStatus: 'pending',
    orderStatus: 'confirmed',
    subtotal: 5870,
    discount: 500,
    shippingFee: 0,
    total: 5370,
    createdAt: '2024-11-28T10:30:00.000Z',
  },
  {
    orderId: 'ORD-2024-002',
    odexId: 'ODX-O-002',
    userId: 'usr_003',
    brandId: 'brand_outfitters_001',
    items: [
      { itemId: 'oi_003', productId: 'prod_006', brandId: 'brand_outfitters_001', variantId: 'var_1_L_black', productName: 'Puffer Jacket - Winter Essential', productImage: 'https://images.unsplash.com/photo-1544923246-77307dd270b4?w=200', variantLabel: 'L / Black', quantity: 1, unitPrice: 5990, totalPrice: 5990 },
    ],
    shippingAddress: { fullName: 'Ahmed Raza', phone: '+92-321-7654321', addressLine1: 'Apt 3B, Block 7', city: 'Karachi', state: 'Sindh', postalCode: '75500', country: 'Pakistan' },
    paymentMethod: 'Credit Card',
    paymentStatus: 'paid',
    orderStatus: 'shipped',
    trackingNumber: 'TCS-123456789',
    subtotal: 5990,
    discount: 0,
    shippingFee: 200,
    total: 6190,
    createdAt: '2024-11-25T14:00:00.000Z',
  },
  {
    orderId: 'ORD-2024-003',
    odexId: 'ODX-O-003',
    userId: 'usr_007',
    brandId: 'brand_outfitters_001',
    items: [
      { itemId: 'oi_004', productId: 'prod_008', brandId: 'brand_outfitters_001', variantId: 'var_1_M_lavender', productName: 'Oversized Hoodie - Women', productImage: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=200', variantLabel: 'M / Lavender', quantity: 1, unitPrice: 3490, totalPrice: 3490 },
      { itemId: 'oi_005', productId: 'prod_007', brandId: 'brand_outfitters_001', variantId: 'var_1_S_blushpink', productName: 'Ribbed Crop Top', productImage: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=200', variantLabel: 'S / Blush Pink', quantity: 2, unitPrice: 1290, totalPrice: 2580 },
    ],
    shippingAddress: { fullName: 'Aisha Noor', phone: '+92-333-9876543', addressLine1: 'House 22, DHA Phase 5', city: 'Islamabad', state: 'ICT', postalCode: '44000', country: 'Pakistan' },
    paymentMethod: 'JazzCash',
    paymentStatus: 'paid',
    orderStatus: 'delivered',
    subtotal: 6070,
    discount: 607,
    shippingFee: 0,
    total: 5463,
    createdAt: '2024-11-20T09:00:00.000Z',
  },
];

// ── Banner Data ─────────────────────────────────

export const SHOPPING_BANNERS = [
  {
    id: 'banner_001',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=400&fit=crop',
    title: 'Winter Sale',
    subtitle: 'Up to 50% off on jackets & hoodies',
    brandId: 'brand_outfitters_001',
  },
  {
    id: 'banner_002',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=400&fit=crop',
    title: 'New Arrivals',
    subtitle: 'Fresh styles just dropped',
    brandId: 'brand_outfitters_001',
  },
  {
    id: 'banner_003',
    image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&h=400&fit=crop',
    title: 'Sneaker Drop',
    subtitle: 'Retro classics back in stock',
    brandId: 'brand_outfitters_001',
  },
];

// ── Helper: Simulate API delay ──────────────────

export const simulateDelay = (ms: number = 300): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ── Helper: Paginate array ──────────────────────

export function paginateArray<T>(
  items: T[],
  page: number,
  limit: number
): PaginatedResponse<T> {
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  const total = items.length;
  const pages = Math.ceil(total / limit);

  return {
    success: true,
    data,
    pagination: { page, limit, total, pages },
  };
}

// ── Helper: Single response wrapper ─────────────

export function singleResponse<T>(data: T): SingleResponse<T> {
  return { success: true, data };
}
