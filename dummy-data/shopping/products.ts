import type { Product } from '../../types/shopping';

// ── Helper ──────────────────────────────────
const mkVariants = (
  prefix: string,
  sizes: string[],
  colors: { name: string; code: string }[],
  extra = 0
) =>
  sizes.flatMap((size, si) =>
    colors.map((c, ci) => ({
      variantId: `${prefix}-${si}-${ci}`,
      size,
      color: c.name,
      colorCode: c.code,
      additionalPrice: extra,
      stockQuantity: Math.floor(Math.random() * 20) + 2,
      sku: `${prefix}-${size}-${c.name}`.toUpperCase(),
    }))
  );

const img = (brand: string, n: number) =>
  `https://placehold.co/600x800/${brand}/FFF?text=Product+${n}`;

// ── Outfitters (10) ─────────────────────────
const outfittersColors = [
  { name: 'Black', code: '#000000' },
  { name: 'Navy', code: '#1B2A4A' },
  { name: 'Olive', code: '#556B2F' },
];
const menSizes = ['S', 'M', 'L', 'XL'];

const OUTFITTERS: Product[] = [
  {
    productId: 'otf-001', odexId: 'odex-otf-001', brandId: 'brand-outfitters', sku: 'OTF-TS-001',
    name: 'Classic Crew Neck T-Shirt', description: 'Soft cotton crew neck tee with signature Outfitters branding. Perfect for casual everyday wear.',
    images: [img('FF6B35', 1), img('FF6B35', 2)], categoryId: 'cat-men-tshirts',
    variants: mkVariants('otf001', menSizes, outfittersColors),
    basePrice: 2490, salePrice: 1790, rating: 4.3, totalReviews: 142, isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['tshirt', 'casual', 'men'], createdAt: '2024-06-01T10:00:00Z',
  },
  {
    productId: 'otf-002', odexId: 'odex-otf-002', brandId: 'brand-outfitters', sku: 'OTF-JN-002',
    name: 'Slim Fit Denim Jeans', description: 'Premium stretch denim jeans with a modern slim fit. Features 5-pocket styling and subtle whiskering.',
    images: [img('FF6B35', 3), img('FF6B35', 4)], categoryId: 'cat-men-trousers',
    variants: mkVariants('otf002', ['30', '32', '34', '36'], [{ name: 'Blue', code: '#4169E1' }, { name: 'Black', code: '#000' }]),
    basePrice: 4990, rating: 4.5, totalReviews: 89, isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['jeans', 'denim', 'men'], createdAt: '2024-05-15T10:00:00Z',
  },
  {
    productId: 'otf-003', odexId: 'odex-otf-003', brandId: 'brand-outfitters', sku: 'OTF-PL-003',
    name: 'Pique Polo Shirt', description: 'Breathable pique cotton polo with contrast collar. A wardrobe essential for smart casual looks.',
    images: [img('FF6B35', 5)], categoryId: 'cat-men-tshirts',
    variants: mkVariants('otf003', menSizes, [{ name: 'White', code: '#FFFFFF' }, { name: 'Red', code: '#E74C3C' }]),
    basePrice: 3290, salePrice: 2490, rating: 4.1, totalReviews: 67, isFeatured: false, isNewArrival: true, inStock: true,
    tags: ['polo', 'men', 'casual'], createdAt: '2024-08-01T10:00:00Z',
  },
  {
    productId: 'otf-004', odexId: 'odex-otf-004', brandId: 'brand-outfitters', sku: 'OTF-JK-004',
    name: 'Hooded Zip-Up Jacket', description: 'Lightweight zip-up hoodie ideal for layering. Kangaroo pocket and ribbed cuffs.',
    images: [img('FF6B35', 6)], categoryId: 'cat-men-tshirts',
    variants: mkVariants('otf004', menSizes, [{ name: 'Grey', code: '#95A5A6' }, { name: 'Black', code: '#000' }]),
    basePrice: 5990, rating: 4.6, totalReviews: 53, isFeatured: false, isNewArrival: true, inStock: true,
    tags: ['jacket', 'hoodie', 'men'], createdAt: '2024-09-10T10:00:00Z',
  },
  {
    productId: 'otf-005', odexId: 'odex-otf-005', brandId: 'brand-outfitters', sku: 'OTF-CH-005',
    name: 'Chino Shorts', description: 'Relaxed fit cotton chino shorts with roll-up hem. Great for summer weekends.',
    images: [img('FF6B35', 7)], categoryId: 'cat-men-trousers',
    variants: mkVariants('otf005', ['30', '32', '34'], [{ name: 'Beige', code: '#D2B48C' }, { name: 'Olive', code: '#556B2F' }]),
    basePrice: 2990, salePrice: 1990, rating: 4.0, totalReviews: 38, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['shorts', 'summer', 'men'], createdAt: '2024-04-20T10:00:00Z',
  },
  {
    productId: 'otf-006', odexId: 'odex-otf-006', brandId: 'brand-outfitters', sku: 'OTF-WK-006',
    name: "Women's Graphic Tee", description: 'Relaxed fit graphic print tee for women. Soft fabric with bold Outfitters print.',
    images: [img('FF6B35', 8)], categoryId: 'cat-women-kurti',
    variants: mkVariants('otf006', ['XS', 'S', 'M', 'L'], [{ name: 'White', code: '#FFF' }, { name: 'Pink', code: '#E91E63' }]),
    basePrice: 2290, rating: 4.2, totalReviews: 95, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['tshirt', 'graphic', 'women'], createdAt: '2024-06-10T10:00:00Z',
  },
  {
    productId: 'otf-007', odexId: 'odex-otf-007', brandId: 'brand-outfitters', sku: 'OTF-SH-007',
    name: 'Oxford Button-Down Shirt', description: 'Classic oxford cotton shirt with button-down collar. Versatile for office or casual.',
    images: [img('FF6B35', 9)], categoryId: 'cat-men-shirts',
    variants: mkVariants('otf007', menSizes, [{ name: 'Sky Blue', code: '#87CEEB' }, { name: 'White', code: '#FFF' }]),
    basePrice: 3990, rating: 4.4, totalReviews: 78, isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['shirt', 'oxford', 'formal', 'men'], createdAt: '2024-03-01T10:00:00Z',
  },
  {
    productId: 'otf-008', odexId: 'odex-otf-008', brandId: 'brand-outfitters', sku: 'OTF-JG-008',
    name: 'Fleece Jogger Pants', description: 'Comfortable fleece joggers with elasticated waist and cuffed ankles.',
    images: [img('FF6B35', 10)], categoryId: 'cat-men-trousers',
    variants: mkVariants('otf008', menSizes, [{ name: 'Charcoal', code: '#36454F' }, { name: 'Navy', code: '#1B2A4A' }]),
    basePrice: 3490, salePrice: 2790, rating: 4.3, totalReviews: 61, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['jogger', 'fleece', 'men'], createdAt: '2024-07-15T10:00:00Z',
  },
  {
    productId: 'otf-009', odexId: 'odex-otf-009', brandId: 'brand-outfitters', sku: 'OTF-WJ-009',
    name: "Women's High-Waist Jeans", description: 'Skinny fit high-waist jeans with stretch for ultimate comfort.',
    images: [img('FF6B35', 11)], categoryId: 'cat-women-bottoms',
    variants: mkVariants('otf009', ['26', '28', '30', '32'], [{ name: 'Mid Blue', code: '#4682B4' }, { name: 'Black', code: '#000' }]),
    basePrice: 4490, rating: 4.5, totalReviews: 110, isFeatured: true, isNewArrival: true, inStock: true,
    tags: ['jeans', 'women', 'highwaist'], createdAt: '2024-09-01T10:00:00Z',
  },
  {
    productId: 'otf-010', odexId: 'odex-otf-010', brandId: 'brand-outfitters', sku: 'OTF-CP-010',
    name: 'Baseball Cap', description: 'Adjustable cotton twill cap with embroidered Outfitters logo.',
    images: [img('FF6B35', 12)], categoryId: 'cat-men-tshirts',
    variants: mkVariants('otf010', ['One Size'], [{ name: 'Black', code: '#000' }, { name: 'White', code: '#FFF' }, { name: 'Orange', code: '#FF6B35' }]),
    basePrice: 1490, rating: 4.0, totalReviews: 44, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['cap', 'accessories', 'men'], createdAt: '2024-05-01T10:00:00Z',
  },
];

// ── Khaadi (10) ─────────────────────────────
const kColors = [
  { name: 'Maroon', code: '#8B0000' },
  { name: 'Beige', code: '#F5F5DC' },
  { name: 'Teal', code: '#008080' },
];
const wSizes = ['XS', 'S', 'M', 'L'];

const KHAADI: Product[] = [
  {
    productId: 'kh-001', odexId: 'odex-kh-001', brandId: 'brand-khaadi', sku: 'KH-KT-001',
    name: 'Embroidered Lawn Kurti', description: 'Delicate embroidery on premium lawn fabric. A perfect summer staple from Khaadi.',
    images: [img('8B0000', 1), img('8B0000', 2)], categoryId: 'cat-women-kurti',
    variants: mkVariants('kh001', wSizes, kColors),
    basePrice: 4500, salePrice: 3150, rating: 4.6, totalReviews: 234, isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['kurti', 'lawn', 'embroidered', 'women'], createdAt: '2024-03-10T10:00:00Z',
  },
  {
    productId: 'kh-002', odexId: 'odex-kh-002', brandId: 'brand-khaadi', sku: 'KH-UN-002',
    name: '3-Piece Unstitched Lawn Suit', description: 'Premium quality 3-piece unstitched lawn suit with printed dupatta and dyed trouser fabric.',
    images: [img('8B0000', 3)], categoryId: 'cat-women-unstitched',
    variants: mkVariants('kh002', ['Standard'], kColors),
    basePrice: 6990, salePrice: 4990, rating: 4.7, totalReviews: 312, isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['unstitched', 'lawn', '3piece', 'women'], createdAt: '2024-02-20T10:00:00Z',
  },
  {
    productId: 'kh-003', odexId: 'odex-kh-003', brandId: 'brand-khaadi', sku: 'KH-DP-003',
    name: 'Printed Silk Dupatta', description: 'Luxurious silk dupatta with traditional block print. Versatile draping piece.',
    images: [img('8B0000', 4)], categoryId: 'cat-women-scarves',
    variants: mkVariants('kh003', ['One Size'], [{ name: 'Red', code: '#C0392B' }, { name: 'Gold', code: '#D4AF37' }]),
    basePrice: 3990, rating: 4.4, totalReviews: 67, isFeatured: false, isNewArrival: true, inStock: true,
    tags: ['dupatta', 'silk', 'women'], createdAt: '2024-08-15T10:00:00Z',
  },
  {
    productId: 'kh-004', odexId: 'odex-kh-004', brandId: 'brand-khaadi', sku: 'KH-RW-004',
    name: 'Ready-to-Wear Printed Suit', description: 'Stitched 2-piece printed cambric suit. Easy wear for daily comfort.',
    images: [img('8B0000', 5)], categoryId: 'cat-women-ready',
    variants: mkVariants('kh004', wSizes, [{ name: 'Blue', code: '#3498DB' }, { name: 'Pink', code: '#FF69B4' }]),
    basePrice: 5490, salePrice: 3990, rating: 4.3, totalReviews: 158, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['readytowear', 'printed', 'women'], createdAt: '2024-04-12T10:00:00Z',
  },
  {
    productId: 'kh-005', odexId: 'odex-kh-005', brandId: 'brand-khaadi', sku: 'KH-KD-005',
    name: "Girls' Printed Frock", description: 'Adorable printed cotton frock for girls. Comfortable fit for all-day play.',
    images: [img('8B0000', 6)], categoryId: 'cat-kids-girls',
    variants: mkVariants('kh005', ['2-3Y', '4-5Y', '6-7Y', '8-9Y'], [{ name: 'Pink', code: '#FF69B4' }, { name: 'Yellow', code: '#F1C40F' }]),
    basePrice: 2990, rating: 4.5, totalReviews: 42, isFeatured: false, isNewArrival: true, inStock: true,
    tags: ['kids', 'girls', 'frock'], createdAt: '2024-09-01T10:00:00Z',
  },
  {
    productId: 'kh-006', odexId: 'odex-kh-006', brandId: 'brand-khaadi', sku: 'KH-HM-006',
    name: 'Handwoven Cushion Cover', description: 'Artisanal handwoven cushion cover with traditional patterns. Size: 18x18 inches.',
    images: [img('8B0000', 7)], categoryId: 'cat-home-cushions',
    variants: mkVariants('kh006', ['18x18'], [{ name: 'Natural', code: '#D2B48C' }, { name: 'Indigo', code: '#4B0082' }]),
    basePrice: 1990, rating: 4.2, totalReviews: 29, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['home', 'cushion', 'handwoven'], createdAt: '2024-05-20T10:00:00Z',
  },
  {
    productId: 'kh-007', odexId: 'odex-kh-007', brandId: 'brand-khaadi', sku: 'KH-MK-007',
    name: "Men's Kurta Shalwar", description: 'Classic cotton kurta with shalwar. Clean-cut stitching for a polished look.',
    images: [img('8B0000', 8)], categoryId: 'cat-men-kurta',
    variants: mkVariants('kh007', menSizes, [{ name: 'White', code: '#FFF' }, { name: 'Off-White', code: '#FAF0E6' }]),
    basePrice: 5990, rating: 4.4, totalReviews: 93, isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['kurta', 'shalwar', 'men'], createdAt: '2024-02-15T10:00:00Z',
  },
  {
    productId: 'kh-008', odexId: 'odex-kh-008', brandId: 'brand-khaadi', sku: 'KH-EM-008',
    name: 'Embroidered Chiffon Dupatta', description: 'Sheer chiffon dupatta with intricate embroidery border.',
    images: [img('8B0000', 9)], categoryId: 'cat-women-scarves',
    variants: mkVariants('kh008', ['One Size'], kColors),
    basePrice: 4490, salePrice: 2990, rating: 4.5, totalReviews: 81, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['dupatta', 'chiffon', 'embroidered'], createdAt: '2024-06-05T10:00:00Z',
  },
  {
    productId: 'kh-009', odexId: 'odex-kh-009', brandId: 'brand-khaadi', sku: 'KH-BD-009',
    name: 'Printed Bed Sheet Set', description: '3-piece printed cotton bed sheet set (1 bed sheet + 2 pillow covers). King size.',
    images: [img('8B0000', 10)], categoryId: 'cat-home-bedding',
    variants: mkVariants('kh009', ['King'], [{ name: 'Floral', code: '#E8B4B8' }, { name: 'Geometric', code: '#4682B4' }]),
    basePrice: 4990, salePrice: 3490, rating: 4.6, totalReviews: 55, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['bedsheet', 'home', 'printed'], createdAt: '2024-04-01T10:00:00Z',
  },
  {
    productId: 'kh-010', odexId: 'odex-kh-010', brandId: 'brand-khaadi', sku: 'KH-BG-010',
    name: 'Woven Tote Bag', description: 'Handcrafted woven tote bag in Khaadi signature style. Spacious interior.',
    images: [img('8B0000', 11)], categoryId: 'cat-women-kurti',
    variants: mkVariants('kh010', ['One Size'], [{ name: 'Natural', code: '#D2B48C' }, { name: 'Black', code: '#000' }]),
    basePrice: 3490, rating: 4.1, totalReviews: 36, isFeatured: false, isNewArrival: true, inStock: true,
    tags: ['bag', 'tote', 'accessories'], createdAt: '2024-08-20T10:00:00Z',
  },
];

// ── Gul Ahmed (10) ──────────────────────────
const gaColors = [
  { name: 'Navy', code: '#1E4D92' },
  { name: 'White', code: '#FFFFFF' },
  { name: 'Burgundy', code: '#800020' },
];

const GUL_AHMED: Product[] = [
  {
    productId: 'ga-001', odexId: 'odex-ga-001', brandId: 'brand-gulahmed', sku: 'GA-LN-001',
    name: 'Premium Lawn 3-Piece Suit', description: 'Gul Ahmed premium lawn 3-piece unstitched suit. Digitally printed with embroidered neckline.',
    images: [img('1E4D92', 1), img('1E4D92', 2)], categoryId: 'cat-women-unstitched',
    variants: mkVariants('ga001', ['Standard'], gaColors),
    basePrice: 7490, salePrice: 5490, rating: 4.7, totalReviews: 420, isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['lawn', 'premium', '3piece', 'women'], createdAt: '2024-02-01T10:00:00Z',
  },
  {
    productId: 'ga-002', odexId: 'odex-ga-002', brandId: 'brand-gulahmed', sku: 'GA-SK-002',
    name: 'Silk Velvet Shawl', description: 'Luxurious silk velvet shawl with embossed patterns. Perfect for winters.',
    images: [img('1E4D92', 3)], categoryId: 'cat-women-scarves',
    variants: mkVariants('ga002', ['One Size'], [{ name: 'Maroon', code: '#800000' }, { name: 'Black', code: '#000' }]),
    basePrice: 8990, rating: 4.8, totalReviews: 187, isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['shawl', 'silk', 'velvet', 'winter'], createdAt: '2024-01-15T10:00:00Z',
  },
  {
    productId: 'ga-003', odexId: 'odex-ga-003', brandId: 'brand-gulahmed', sku: 'GA-MS-003',
    name: "Men's Wash & Wear Suit", description: '2-piece wash & wear shalwar kameez. Wrinkle-free fabric for everyday comfort.',
    images: [img('1E4D92', 4)], categoryId: 'cat-men-kurta',
    variants: mkVariants('ga003', menSizes, [{ name: 'White', code: '#FFF' }, { name: 'Grey', code: '#808080' }]),
    basePrice: 4990, salePrice: 3990, rating: 4.5, totalReviews: 165, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['kurta', 'washandwear', 'men'], createdAt: '2024-03-05T10:00:00Z',
  },
  {
    productId: 'ga-004', odexId: 'odex-ga-004', brandId: 'brand-gulahmed', sku: 'GA-KR-004',
    name: 'Digital Print Kurti', description: 'Trendy digital print kurti on cambric. A-line silhouette with side slits.',
    images: [img('1E4D92', 5)], categoryId: 'cat-women-kurti',
    variants: mkVariants('ga004', wSizes, gaColors),
    basePrice: 3490, rating: 4.3, totalReviews: 98, isFeatured: false, isNewArrival: true, inStock: true,
    tags: ['kurti', 'digital', 'women'], createdAt: '2024-08-10T10:00:00Z',
  },
  {
    productId: 'ga-005', odexId: 'odex-ga-005', brandId: 'brand-gulahmed', sku: 'GA-BD-005',
    name: 'Jacquard Bed Set', description: 'King-size jacquard weave bed set. 4 pieces including fitted sheet and 2 pillow cases.',
    images: [img('1E4D92', 6)], categoryId: 'cat-home-bedding',
    variants: mkVariants('ga005', ['King', 'Queen'], [{ name: 'Blue', code: '#1E4D92' }, { name: 'Gold', code: '#D4AF37' }]),
    basePrice: 9990, salePrice: 7490, rating: 4.6, totalReviews: 72, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['bedding', 'jacquard', 'home'], createdAt: '2024-04-15T10:00:00Z',
  },
  {
    productId: 'ga-006', odexId: 'odex-ga-006', brandId: 'brand-gulahmed', sku: 'GA-TW-006',
    name: 'Turkish Bath Towel Set', description: 'Set of 4 premium Turkish cotton towels. Highly absorbent, quick-dry.',
    images: [img('1E4D92', 7)], categoryId: 'cat-home-towels',
    variants: mkVariants('ga006', ['Set of 4'], [{ name: 'White', code: '#FFF' }, { name: 'Grey', code: '#808080' }]),
    basePrice: 5990, rating: 4.4, totalReviews: 48, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['towel', 'turkish', 'home'], createdAt: '2024-05-10T10:00:00Z',
  },
  {
    productId: 'ga-007', odexId: 'odex-ga-007', brandId: 'brand-gulahmed', sku: 'GA-KB-007',
    name: "Boys' Kurta Pajama Set", description: 'Festive kurta pajama set for boys. Embroidered neckline, cotton blend.',
    images: [img('1E4D92', 8)], categoryId: 'cat-kids-boys',
    variants: mkVariants('ga007', ['2-3Y', '4-5Y', '6-7Y', '8-9Y'], [{ name: 'White', code: '#FFF' }, { name: 'Sky Blue', code: '#87CEEB' }]),
    basePrice: 3990, rating: 4.5, totalReviews: 33, isFeatured: false, isNewArrival: true, inStock: true,
    tags: ['kids', 'boys', 'kurta', 'festive'], createdAt: '2024-09-05T10:00:00Z',
  },
  {
    productId: 'ga-008', odexId: 'odex-ga-008', brandId: 'brand-gulahmed', sku: 'GA-FS-008',
    name: 'Formal Dress Shirt', description: 'Premium cotton formal shirt with French cuffs. Tailored slim fit.',
    images: [img('1E4D92', 9)], categoryId: 'cat-men-shirts',
    variants: mkVariants('ga008', menSizes, [{ name: 'White', code: '#FFF' }, { name: 'Light Blue', code: '#ADD8E6' }]),
    basePrice: 4490, rating: 4.3, totalReviews: 87, isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['shirt', 'formal', 'men'], createdAt: '2024-03-20T10:00:00Z',
  },
  {
    productId: 'ga-009', odexId: 'odex-ga-009', brandId: 'brand-gulahmed', sku: 'GA-WR-009',
    name: 'Embroidered Organza Suit', description: 'Festive wear embroidered organza 3-piece suit. Shimmering fabric with intricate work.',
    images: [img('1E4D92', 10)], categoryId: 'cat-women-unstitched',
    variants: mkVariants('ga009', ['Standard'], [{ name: 'Peach', code: '#FFCBA4' }, { name: 'Lilac', code: '#C8A2C8' }]),
    basePrice: 14990, rating: 4.8, totalReviews: 56, isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['organza', 'festive', 'embroidered', 'women'], createdAt: '2024-06-20T10:00:00Z',
  },
  {
    productId: 'ga-010', odexId: 'odex-ga-010', brandId: 'brand-gulahmed', sku: 'GA-CT-010',
    name: "Girls' Cotton Frock", description: 'Playful printed cotton frock for little girls. Comfortable and colorful.',
    images: [img('1E4D92', 11)], categoryId: 'cat-kids-girls',
    variants: mkVariants('ga010', ['2-3Y', '4-5Y', '6-7Y'], [{ name: 'Pink', code: '#FF69B4' }, { name: 'Mint', code: '#98FF98' }]),
    basePrice: 2490, rating: 4.3, totalReviews: 28, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['kids', 'girls', 'frock', 'cotton'], createdAt: '2024-07-01T10:00:00Z',
  },
];

// ── Beechtree (10) ──────────────────────────
const btColors = [
  { name: 'Blush', code: '#DE5D83' },
  { name: 'Ivory', code: '#FFFFF0' },
  { name: 'Sage', code: '#B2AC88' },
];

const BEECHTREE: Product[] = [
  {
    productId: 'bt-001', odexId: 'odex-bt-001', brandId: 'brand-beechtree', sku: 'BT-KT-001',
    name: 'Printed Cambric Kurti', description: 'Vibrant printed kurti on soft cambric. Relaxed fit with band collar.',
    images: [img('E91E63', 1), img('E91E63', 2)], categoryId: 'cat-women-kurti',
    variants: mkVariants('bt001', wSizes, btColors),
    basePrice: 2990, salePrice: 1990, rating: 4.4, totalReviews: 189, isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['kurti', 'cambric', 'printed', 'women'], createdAt: '2024-04-05T10:00:00Z',
  },
  {
    productId: 'bt-002', odexId: 'odex-bt-002', brandId: 'brand-beechtree', sku: 'BT-2P-002',
    name: '2-Piece Lawn Suit', description: 'Trendy 2-piece lawn suit with printed shirt and dyed trousers.',
    images: [img('E91E63', 3)], categoryId: 'cat-women-ready',
    variants: mkVariants('bt002', wSizes, [{ name: 'Coral', code: '#FF6F61' }, { name: 'Teal', code: '#008080' }]),
    basePrice: 3990, salePrice: 2790, rating: 4.5, totalReviews: 145, isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['2piece', 'lawn', 'women'], createdAt: '2024-03-15T10:00:00Z',
  },
  {
    productId: 'bt-003', odexId: 'odex-bt-003', brandId: 'brand-beechtree', sku: 'BT-TP-003',
    name: 'Embroidered Western Top', description: 'Casual western top with subtle embroidery. Flared sleeves, cotton blend.',
    images: [img('E91E63', 4)], categoryId: 'cat-women-kurti',
    variants: mkVariants('bt003', wSizes, btColors),
    basePrice: 2490, rating: 4.2, totalReviews: 72, isFeatured: false, isNewArrival: true, inStock: true,
    tags: ['top', 'western', 'embroidered', 'women'], createdAt: '2024-08-25T10:00:00Z',
  },
  {
    productId: 'bt-004', odexId: 'odex-bt-004', brandId: 'brand-beechtree', sku: 'BT-TR-004',
    name: 'Cigarette Pants', description: 'Slim-fit cigarette pants in stretchable cotton. Versatile bottom wear.',
    images: [img('E91E63', 5)], categoryId: 'cat-women-bottoms',
    variants: mkVariants('bt004', wSizes, [{ name: 'Black', code: '#000' }, { name: 'White', code: '#FFF' }, { name: 'Nude', code: '#F5CBA7' }]),
    basePrice: 1990, rating: 4.3, totalReviews: 210, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['pants', 'cigarette', 'women'], createdAt: '2024-02-10T10:00:00Z',
  },
  {
    productId: 'bt-005', odexId: 'odex-bt-005', brandId: 'brand-beechtree', sku: 'BT-UN-005',
    name: '3-Piece Printed Lawn', description: 'Beechtree signature 3-piece printed lawn. Shirt, dupatta, and trouser fabric.',
    images: [img('E91E63', 6)], categoryId: 'cat-women-unstitched',
    variants: mkVariants('bt005', ['Standard'], [{ name: 'Multi', code: '#E91E63' }]),
    basePrice: 4990, salePrice: 3490, rating: 4.6, totalReviews: 167, isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['3piece', 'lawn', 'unstitched', 'women'], createdAt: '2024-03-01T10:00:00Z',
  },
  {
    productId: 'bt-006', odexId: 'odex-bt-006', brandId: 'brand-beechtree', sku: 'BT-DP-006',
    name: 'Cotton Silk Dupatta', description: 'Lightweight cotton silk dupatta with printed border. Adds grace to any outfit.',
    images: [img('E91E63', 7)], categoryId: 'cat-women-scarves',
    variants: mkVariants('bt006', ['One Size'], btColors),
    basePrice: 2490, salePrice: 1490, rating: 4.1, totalReviews: 54, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['dupatta', 'cotton', 'silk'], createdAt: '2024-05-15T10:00:00Z',
  },
  {
    productId: 'bt-007', odexId: 'odex-bt-007', brandId: 'brand-beechtree', sku: 'BT-GK-007',
    name: "Girls' Printed Kurti", description: 'Cute printed kurti for girls. Lightweight fabric for warm weather.',
    images: [img('E91E63', 8)], categoryId: 'cat-kids-girls',
    variants: mkVariants('bt007', ['2-3Y', '4-5Y', '6-7Y'], [{ name: 'Pink', code: '#FF69B4' }, { name: 'Lavender', code: '#E6E6FA' }]),
    basePrice: 1990, rating: 4.3, totalReviews: 31, isFeatured: false, isNewArrival: true, inStock: true,
    tags: ['kids', 'girls', 'kurti'], createdAt: '2024-09-10T10:00:00Z',
  },
  {
    productId: 'bt-008', odexId: 'odex-bt-008', brandId: 'brand-beechtree', sku: 'BT-MX-008',
    name: 'Palazzo Pants', description: 'Wide-leg palazzo pants in flowing fabric. Comfortable and trendy.',
    images: [img('E91E63', 9)], categoryId: 'cat-women-bottoms',
    variants: mkVariants('bt008', wSizes, [{ name: 'Navy', code: '#1B2A4A' }, { name: 'Olive', code: '#556B2F' }]),
    basePrice: 2290, rating: 4.4, totalReviews: 88, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['palazzo', 'pants', 'women'], createdAt: '2024-06-15T10:00:00Z',
  },
  {
    productId: 'bt-009', odexId: 'odex-bt-009', brandId: 'brand-beechtree', sku: 'BT-SC-009',
    name: 'Printed Stole', description: 'Printed viscose stole. Lightweight draping piece for layering.',
    images: [img('E91E63', 10)], categoryId: 'cat-women-scarves',
    variants: mkVariants('bt009', ['One Size'], btColors),
    basePrice: 1490, rating: 4.0, totalReviews: 23, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['stole', 'printed', 'accessories'], createdAt: '2024-07-20T10:00:00Z',
  },
  {
    productId: 'bt-010', odexId: 'odex-bt-010', brandId: 'brand-beechtree', sku: 'BT-FW-010',
    name: 'Festive Embroidered Suit', description: '3-piece stitched embroidered suit for festive occasions. Rich fabric with mirror work.',
    images: [img('E91E63', 11)], categoryId: 'cat-women-ready',
    variants: mkVariants('bt010', wSizes, [{ name: 'Wine', code: '#722F37' }, { name: 'Emerald', code: '#50C878' }]),
    basePrice: 8990, rating: 4.7, totalReviews: 45, isFeatured: true, isNewArrival: true, inStock: true,
    tags: ['festive', 'embroidered', 'women'], createdAt: '2024-09-15T10:00:00Z',
  },
];

// ── Ideas by Gul Ahmed (10) ─────────────────
const idColors = [
  { name: 'Green', code: '#4CAF50' },
  { name: 'Cream', code: '#FFFDD0' },
  { name: 'Brown', code: '#8B4513' },
];

const IDEAS: Product[] = [
  {
    productId: 'id-001', odexId: 'odex-id-001', brandId: 'brand-ideas', sku: 'ID-KT-001',
    name: 'Pret Printed Kurti', description: 'Ready-to-wear digital print kurti on khaddar. Warm and stylish for winters.',
    images: [img('4CAF50', 1), img('4CAF50', 2)], categoryId: 'cat-women-kurti',
    variants: mkVariants('id001', wSizes, idColors),
    basePrice: 3490, salePrice: 2490, rating: 4.4, totalReviews: 132, isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['kurti', 'pret', 'khaddar', 'women'], createdAt: '2024-03-20T10:00:00Z',
  },
  {
    productId: 'id-002', odexId: 'odex-id-002', brandId: 'brand-ideas', sku: 'ID-MK-002',
    name: "Men's Cotton Polo", description: 'Pure cotton polo shirt with contrast tipping. Smart casual essential.',
    images: [img('4CAF50', 3)], categoryId: 'cat-men-tshirts',
    variants: mkVariants('id002', menSizes, [{ name: 'Forest', code: '#228B22' }, { name: 'Navy', code: '#000080' }]),
    basePrice: 2990, rating: 4.2, totalReviews: 77, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['polo', 'cotton', 'men'], createdAt: '2024-04-10T10:00:00Z',
  },
  {
    productId: 'id-003', odexId: 'odex-id-003', brandId: 'brand-ideas', sku: 'ID-UN-003',
    name: '2-Piece Unstitched Khaddar', description: 'Winter 2-piece khaddar suit. Warm fabric with traditional block prints.',
    images: [img('4CAF50', 4)], categoryId: 'cat-women-unstitched',
    variants: mkVariants('id003', ['Standard'], idColors),
    basePrice: 4490, salePrice: 2990, rating: 4.5, totalReviews: 198, isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['unstitched', 'khaddar', 'winter', 'women'], createdAt: '2024-01-25T10:00:00Z',
  },
  {
    productId: 'id-004', odexId: 'odex-id-004', brandId: 'brand-ideas', sku: 'ID-FR-004',
    name: 'Oud & Musk Perfume', description: 'Signature oud and musk fragrance. Long-lasting scent in a sleek bottle.',
    images: [img('4CAF50', 5)], categoryId: 'cat-women-kurti',
    variants: mkVariants('id004', ['50ml', '100ml'], [{ name: 'Gold', code: '#D4AF37' }], 500),
    basePrice: 3990, rating: 4.6, totalReviews: 64, isFeatured: false, isNewArrival: true, inStock: true,
    tags: ['fragrance', 'perfume', 'oud'], createdAt: '2024-08-05T10:00:00Z',
  },
  {
    productId: 'id-005', odexId: 'odex-id-005', brandId: 'brand-ideas', sku: 'ID-HM-005',
    name: 'Velvet Cushion Set', description: 'Set of 2 velvet cushion covers with metallic embroidery. 16x16 inches.',
    images: [img('4CAF50', 6)], categoryId: 'cat-home-cushions',
    variants: mkVariants('id005', ['16x16'], [{ name: 'Emerald', code: '#50C878' }, { name: 'Burgundy', code: '#800020' }]),
    basePrice: 2490, rating: 4.3, totalReviews: 39, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['cushion', 'velvet', 'home'], createdAt: '2024-05-25T10:00:00Z',
  },
  {
    productId: 'id-006', odexId: 'odex-id-006', brandId: 'brand-ideas', sku: 'ID-SH-006',
    name: "Men's Formal Shirt", description: 'Wrinkle-free formal shirt with cutaway collar. Premium weave fabric.',
    images: [img('4CAF50', 7)], categoryId: 'cat-men-shirts',
    variants: mkVariants('id006', menSizes, [{ name: 'White', code: '#FFF' }, { name: 'Mint', code: '#98FF98' }]),
    basePrice: 3990, salePrice: 2990, rating: 4.3, totalReviews: 56, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['shirt', 'formal', 'men'], createdAt: '2024-06-01T10:00:00Z',
  },
  {
    productId: 'id-007', odexId: 'odex-id-007', brandId: 'brand-ideas', sku: 'ID-KD-007',
    name: "Boys' Printed T-Shirt", description: 'Fun graphic print cotton tee for boys. Bright colors and playful designs.',
    images: [img('4CAF50', 8)], categoryId: 'cat-kids-boys',
    variants: mkVariants('id007', ['2-3Y', '4-5Y', '6-7Y', '8-9Y'], [{ name: 'Green', code: '#4CAF50' }, { name: 'Red', code: '#E74C3C' }]),
    basePrice: 1490, rating: 4.1, totalReviews: 22, isFeatured: false, isNewArrival: true, inStock: true,
    tags: ['kids', 'boys', 'tshirt'], createdAt: '2024-09-20T10:00:00Z',
  },
  {
    productId: 'id-008', odexId: 'odex-id-008', brandId: 'brand-ideas', sku: 'ID-TW-008',
    name: 'Luxury Bath Robe', description: 'Turkish cotton bath robe. Plush, soft, and highly absorbent.',
    images: [img('4CAF50', 9)], categoryId: 'cat-home-towels',
    variants: mkVariants('id008', ['M', 'L', 'XL'], [{ name: 'White', code: '#FFF' }, { name: 'Grey', code: '#808080' }]),
    basePrice: 6990, rating: 4.5, totalReviews: 18, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['bathrobe', 'luxury', 'home'], createdAt: '2024-07-10T10:00:00Z',
  },
  {
    productId: 'id-009', odexId: 'odex-id-009', brandId: 'brand-ideas', sku: 'ID-RW-009',
    name: 'Ready-to-Wear Embroidered Suit', description: 'Festive stitched suit with heavy embroidery. Includes shirt, dupatta, and trousers.',
    images: [img('4CAF50', 10)], categoryId: 'cat-women-ready',
    variants: mkVariants('id009', wSizes, [{ name: 'Rust', code: '#B7410E' }, { name: 'Teal', code: '#008080' }]),
    basePrice: 7990, salePrice: 5990, rating: 4.6, totalReviews: 73, isFeatured: true, isNewArrival: false, inStock: true,
    tags: ['readytowear', 'embroidered', 'festive', 'women'], createdAt: '2024-06-25T10:00:00Z',
  },
  {
    productId: 'id-010', odexId: 'odex-id-010', brandId: 'brand-ideas', sku: 'ID-MJ-010',
    name: "Men's Casual Joggers", description: 'Comfortable cotton blend joggers. Relaxed weekend wear.',
    images: [img('4CAF50', 11)], categoryId: 'cat-men-trousers',
    variants: mkVariants('id010', menSizes, [{ name: 'Olive', code: '#556B2F' }, { name: 'Black', code: '#000' }]),
    basePrice: 2990, rating: 4.2, totalReviews: 41, isFeatured: false, isNewArrival: false, inStock: true,
    tags: ['joggers', 'casual', 'men'], createdAt: '2024-05-05T10:00:00Z',
  },
];

// ── Combined Export ─────────────────────────

export const DUMMY_PRODUCTS: Product[] = [
  ...OUTFITTERS,
  ...KHAADI,
  ...GUL_AHMED,
  ...BEECHTREE,
  ...IDEAS,
];

export const getProductsByBrand = (brandId: string) =>
  DUMMY_PRODUCTS.filter((p) => p.brandId === brandId);

export const getFeaturedProducts = () =>
  DUMMY_PRODUCTS.filter((p) => p.isFeatured);

export const getNewArrivals = () =>
  DUMMY_PRODUCTS.filter((p) => p.isNewArrival);

export const getProductById = (productId: string) =>
  DUMMY_PRODUCTS.find((p) => p.productId === productId);
