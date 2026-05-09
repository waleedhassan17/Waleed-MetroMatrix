import type { ProductReview } from '../../types/shopping';
import { DUMMY_PRODUCTS } from './products';

// ── Realistic Pakistani user names ──────────

const USERS = [
  { name: 'Ayesha Khan', avatar: null },
  { name: 'Fatima Rizvi', avatar: null },
  { name: 'Ahmed Raza', avatar: null },
  { name: 'Sara Malik', avatar: null },
  { name: 'Hassan Ali', avatar: null },
  { name: 'Zainab Noor', avatar: null },
  { name: 'Usman Ghani', avatar: null },
  { name: 'Hira Batool', avatar: null },
  { name: 'Bilal Ahmed', avatar: null },
  { name: 'Maryam Iqbal', avatar: null },
  { name: 'Tariq Mehmood', avatar: null },
  { name: 'Sana Sheikh', avatar: null },
  { name: 'Omer Farooq', avatar: null },
  { name: 'Nadia Hussain', avatar: null },
  { name: 'Imran Siddiqui', avatar: null },
  { name: 'Rabia Aslam', avatar: null },
  { name: 'Kamran Javed', avatar: null },
  { name: 'Amna Yousaf', avatar: null },
  { name: 'Faisal Nawaz', avatar: null },
  { name: 'Mehreen Shah', avatar: null },
];

const POSITIVE_COMMENTS = [
  'Excellent quality! The fabric is soft and the stitching is perfect. Highly recommend.',
  'Loved the color and fit. Exactly as shown in the pictures. Will order again.',
  'Great value for money. The material feels premium and the design is beautiful.',
  'Arrived within 3 days. Packaging was neat. Product exceeded my expectations.',
  'My go-to brand now. The quality is always consistent and trendy.',
  'Perfect for everyday wear. Comfortable and stylish at the same time.',
  'Got so many compliments wearing this! The design is unique and elegant.',
  'Bought for Eid and it was the best decision. Looked absolutely gorgeous.',
  'The embroidery work is stunning. Way better than what I expected at this price.',
  'Fits true to size. The color is vibrant even after multiple washes.',
  'Superb quality! I have already ordered 3 more in different colors.',
  'The fabric breathes well in this hot weather. Perfect summer wear.',
  'Delivery was fast and the product is exactly as described. Very happy.',
  'Gifted this to my mother and she absolutely loved it. Great choice.',
  'Wonderful craftsmanship. You can see the attention to detail in every stitch.',
];

const NEUTRAL_COMMENTS = [
  'Good product overall. The fabric quality is decent but the stitching could be better.',
  'It is okay. The color was slightly different from what was shown online.',
  'Fits well but the material is thinner than expected. Still usable.',
  'Average quality for the price. Nothing extraordinary but not bad either.',
  'Took a week to deliver. Product is fine but packaging was basic.',
  'The design is nice but it shrank a little after first wash. Go one size up.',
  'It is decent. I have seen better quality from this brand in the past.',
  'Fair enough for the sale price. Would not pay full price for this.',
];

const NEGATIVE_COMMENTS = [
  'Disappointed with the fabric quality. It feels cheap compared to what was advertised.',
  'The color faded after just one wash. Not what I expected from this brand.',
  'Size runs too small. Had to exchange for a larger size. Hassle.',
  'Delivery took 10 days and the packaging was damaged. Product was okay though.',
  'The embroidery thread started coming loose after first wear. Poor quality.',
];

const TITLES_POSITIVE = [
  'Absolutely love it!', 'Best purchase this month', 'Highly recommended',
  'Worth every rupee', 'Beautiful design', 'Perfect fit!',
];
const TITLES_NEUTRAL = ['It is okay', 'Decent purchase', 'Average quality', 'Could be better'];
const TITLES_NEGATIVE = ['Disappointed', 'Not as expected', 'Quality issues'];

// ── Generate Reviews ────────────────────────

function randomDate(start: Date, end: Date): string {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  ).toISOString();
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateReviewsForProduct(productId: string, count: number): ProductReview[] {
  const reviews: ProductReview[] = [];
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-10-01');

  for (let i = 0; i < count; i++) {
    const rating = weightedRating();
    const user = pickRandom(USERS);
    let comment: string;
    let title: string | undefined;

    if (rating >= 4) {
      comment = pickRandom(POSITIVE_COMMENTS);
      title = Math.random() > 0.4 ? pickRandom(TITLES_POSITIVE) : undefined;
    } else if (rating >= 3) {
      comment = pickRandom(NEUTRAL_COMMENTS);
      title = Math.random() > 0.5 ? pickRandom(TITLES_NEUTRAL) : undefined;
    } else {
      comment = pickRandom(NEGATIVE_COMMENTS);
      title = Math.random() > 0.5 ? pickRandom(TITLES_NEGATIVE) : undefined;
    }

    reviews.push({
      reviewId: `rv-${productId}-${i}`,
      productId,
      userId: `user-${Math.floor(Math.random() * 1000)}`,
      userName: user.name,
      userAvatar: user.avatar || undefined,
      rating,
      title,
      comment,
      images: Math.random() > 0.75
        ? [`https://placehold.co/200x200/E0E0E0/666?text=Review+Photo`]
        : undefined,
      isVerifiedPurchase: Math.random() > 0.3,
      createdAt: randomDate(startDate, endDate),
    });
  }

  return reviews.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Weighted towards higher ratings (realistic distribution)
function weightedRating(): number {
  const r = Math.random();
  if (r < 0.35) return 5;
  if (r < 0.65) return 4;
  if (r < 0.80) return 3;
  if (r < 0.92) return 2;
  return 1;
}

// Generate 2 reviews per product = 100 reviews for 50 products
export const DUMMY_REVIEWS: ProductReview[] = DUMMY_PRODUCTS.flatMap((p) =>
  generateReviewsForProduct(p.productId, 2)
);

export const getReviewsByProduct = (productId: string) =>
  DUMMY_REVIEWS.filter((r) => r.productId === productId);

export const getReviewsByRating = (productId: string, rating: number) =>
  DUMMY_REVIEWS.filter((r) => r.productId === productId && Math.round(r.rating) === rating);
