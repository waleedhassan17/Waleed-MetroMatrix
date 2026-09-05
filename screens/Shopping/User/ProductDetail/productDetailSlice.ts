import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { Product, ProductVariant, ProductReview } from '../../../../types/shopping';
import { fetchProductByIdApi, fetchProductReviewsApi } from '../../../../networks/shopping/productApi';
import { addItem } from '../Cart/cartSlice';
import { toggleWishlistItem } from '../Wishlist/wishlistSlice';

// ── State Interface ─────────────────────────

export interface ProductDetailState {
  product: Product | null;
  selectedVariant: ProductVariant | null;
  selectedSize: string | null;
  selectedColor: string | null;
  quantity: number;
  reviews: ProductReview[];
  loading: boolean;
  reviewsLoading: boolean;
  addToCartLoading: boolean;
  error: string | null;
  activeTab: 'description' | 'sizeGuide' | 'reviews';
  imageIndex: number;
  isWishlisted: boolean;
}

const initialState: ProductDetailState = {
  product: null,
  selectedVariant: null,
  selectedSize: null,
  selectedColor: null,
  quantity: 1,
  reviews: [],
  loading: false,
  reviewsLoading: false,
  addToCartLoading: false,
  error: null,
  activeTab: 'description',
  imageIndex: 0,
  isWishlisted: false,
};

// ── Async Thunks ────────────────────────────

export const fetchProductDetail = createAsyncThunk(
  'productDetail/fetchProductDetail',
  async (productId: string, { rejectWithValue }) => {
    try {
      const [productRes, reviewsRes] = await Promise.all([
        fetchProductByIdApi(productId),
        fetchProductReviewsApi(productId, { page: 1, limit: 5 }),
      ]);

      if (!productRes.success) {
        return rejectWithValue('Product not found');
      }

      return {
        product: productRes.data,
        reviews: reviewsRes.success ? reviewsRes.data : [],
      };
    } catch (error: any) {
      if (error.message?.includes('Network')) {
        return rejectWithValue('No internet connection.');
      }
      return rejectWithValue(error.message || 'Failed to load product.');
    }
  }
);

/**
 * Add the selected variant to the cart.
 *
 * This used to POST /cart/items itself AND dispatch cart/addItem, which POSTs
 * the same line again — and the server merges by addition
 * (requestedTotal = quantity + existing.quantity), so every add put double the
 * chosen quantity in the cart. There is exactly one write now: cart/addItem,
 * whose fulfilled handler applies the server's cart response as authoritative,
 * which also means the row carries the real brandName rather than a brand id.
 */
export const addToCart = createAsyncThunk(
  'productDetail/addToCart',
  async (_, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as { productDetail: ProductDetailState };
    const { product, selectedVariant, quantity } = state.productDetail;

    if (!product || !selectedVariant) {
      return rejectWithValue('Please select a variant');
    }

    try {
      return await dispatch(
        addItem({
          productId: product.productId,
          brandId: product.brandId,
          variantId: selectedVariant.variantId,
          quantity,
        })
      ).unwrap();
    } catch (error: any) {
      return rejectWithValue(
        typeof error === 'string' ? error : error?.message || 'Failed to add to cart.'
      );
    }
  }
);

// Thunk that toggles wishlist in the persisted wishlist slice
export const toggleWishlistWithPersist = createAsyncThunk(
  'productDetail/toggleWishlistWithPersist',
  async (_, { getState, dispatch }) => {
    const state = getState() as { productDetail: ProductDetailState };
    const { product } = state.productDetail;
    if (!product) return;

    dispatch(toggleWishlistItem({ productId: product.productId }));
  }
);

// ── Helpers ─────────────────────────────────

function findMatchingVariant(
  product: Product,
  size: string | null,
  color: string | null
): ProductVariant | null {
  return (
    product.variants.find(
      (v) =>
        (size ? v.size === size : true) &&
        (color ? v.color === color : true) &&
        v.stockQuantity > 0
    ) || null
  );
}

// ── Slice ───────────────────────────────────

const productDetailSlice = createSlice({
  name: 'productDetail',
  initialState,
  reducers: {
    setSelectedSize(state, action: PayloadAction<string>) {
      state.selectedSize = action.payload;
      if (state.product) {
        state.selectedVariant = findMatchingVariant(state.product, action.payload, state.selectedColor);
      }
      state.quantity = 1;
    },
    setSelectedColor(state, action: PayloadAction<string>) {
      state.selectedColor = action.payload;
      if (state.product) {
        state.selectedVariant = findMatchingVariant(state.product, state.selectedSize, action.payload);
      }
      state.quantity = 1;
    },
    setQuantity(state, action: PayloadAction<number>) {
      const max = state.selectedVariant?.stockQuantity || 10;
      state.quantity = Math.max(1, Math.min(action.payload, max));
    },
    setActiveTab(state, action: PayloadAction<ProductDetailState['activeTab']>) {
      state.activeTab = action.payload;
    },
    setImageIndex(state, action: PayloadAction<number>) {
      state.imageIndex = action.payload;
    },
    toggleWishlist(state) {
      state.isWishlisted = !state.isWishlisted;
    },
    resetProductDetail(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchProductDetail
      .addCase(fetchProductDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.product = action.payload.product;
        state.reviews = action.payload.reviews;
        // Auto-select first available variant
        const p = action.payload.product;
        if (p.variants.length > 0) {
          const firstAvailable = p.variants.find((v) => v.stockQuantity > 0) || p.variants[0];
          state.selectedVariant = firstAvailable;
          state.selectedSize = firstAvailable.size || null;
          state.selectedColor = firstAvailable.color || null;
        }
      })
      .addCase(fetchProductDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // addToCart
      .addCase(addToCart.pending, (state) => {
        state.addToCartLoading = true;
      })
      .addCase(addToCart.fulfilled, (state) => {
        state.addToCartLoading = false;
      })
      .addCase(addToCart.rejected, (state) => {
        state.addToCartLoading = false;
      });
  },
});

export const {
  setSelectedSize,
  setSelectedColor,
  setQuantity,
  setActiveTab,
  setImageIndex,
  toggleWishlist,
  resetProductDetail,
} = productDetailSlice.actions;

// ── Selectors ───────────────────────────────

export const selectProductDetail = (state: { productDetail: ProductDetailState }) => state.productDetail;
export const selectProduct = (state: { productDetail: ProductDetailState }) => state.productDetail.product;
export const selectSelectedVariant = (state: { productDetail: ProductDetailState }) => state.productDetail.selectedVariant;
export const selectProductDetailLoading = (state: { productDetail: ProductDetailState }) => state.productDetail.loading;
export const selectProductReviews = (state: { productDetail: ProductDetailState }) => state.productDetail.reviews;

// Computed price based on selected variant (memoized)
export const selectCurrentPrice = createSelector(
  [(state: { productDetail: ProductDetailState }) => state.productDetail.product,
   (state: { productDetail: ProductDetailState }) => state.productDetail.selectedVariant],
  (product, selectedVariant) => {
    if (!product) return { price: 0, originalPrice: 0, hasDiscount: false };
    const base = product.basePrice + (selectedVariant?.additionalPrice || 0);
    const sale = product.salePrice ? product.salePrice + (selectedVariant?.additionalPrice || 0) : null;
    return {
      price: sale || base,
      originalPrice: base,
      hasDiscount: !!sale && sale < base,
    };
  }
);

export default productDetailSlice.reducer;
