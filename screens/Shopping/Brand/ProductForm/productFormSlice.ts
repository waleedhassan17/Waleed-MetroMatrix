import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Product, ProductVariant } from '../../../../types/shopping';

export interface ProductFormState {
  saving: boolean;
  error: string | null;
  draft: Product;
}

const emptyVariant: ProductVariant = {
  variantId: 'variant-1',
  size: 'M',
  additionalPrice: 0,
  stockQuantity: 12,
  sku: 'SKU-DRAFT-M',
};

const initialState: ProductFormState = {
  saving: false,
  error: null,
  draft: {
    productId: 'draft-product',
    odexId: 'draft-product',
    brandId: 'brand-1',
    sku: 'SKU-DRAFT',
    name: 'New Product',
    description: 'Describe the product here.',
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
    categoryId: 'cat-apparel',
    variants: [emptyVariant],
    basePrice: 2999,
    salePrice: 2499,
    rating: 0,
    totalReviews: 0,
    isFeatured: false,
    isNewArrival: true,
    inStock: true,
    tags: ['new'],
    createdAt: new Date().toISOString(),
  },
};

const productFormSlice = createSlice({
  name: 'productForm',
  initialState,
  reducers: {
    setField(state, action: PayloadAction<{ key: keyof Product; value: any }>) {
      (state.draft as any)[action.payload.key] = action.payload.value;
    },
    setVariant(state, action: PayloadAction<ProductVariant>) {
      state.draft.variants = [action.payload];
    },
    toggleFlag(state, action: PayloadAction<'isFeatured' | 'isNewArrival' | 'inStock'>) {
      state.draft[action.payload] = !state.draft[action.payload];
    },
    setSaving(state, action: PayloadAction<boolean>) {
      state.saving = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    resetDraft(state) {
      Object.assign(state, initialState);
    },
  },
});

export const { setField, setVariant, toggleFlag, setSaving, setError, resetDraft } = productFormSlice.actions;
export const selectProductForm = (state: { productForm: ProductFormState }) => state.productForm;
export default productFormSlice.reducer;