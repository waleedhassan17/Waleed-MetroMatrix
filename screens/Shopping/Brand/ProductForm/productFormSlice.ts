import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Product, ProductVariant } from '../../../../types/shopping';
import { createProductApi, updateProductApi, fetchProductByIdApi } from '../../../../networks/shopping/productApi';

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

// Load an existing product into the draft (edit mode)
export const loadProductDraft = createAsyncThunk(
  'productForm/load',
  async (productId: string, { rejectWithValue }) => {
    try {
      const res = await fetchProductByIdApi(productId);
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load product');
    }
  }
);

// Persist the draft: create when it's a new draft, update otherwise
export const saveProductDraft = createAsyncThunk(
  'productForm/save',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { productForm } = getState() as { productForm: ProductFormState };
      const draft = productForm.draft;
      const payload: any = {
        sku: draft.sku,
        name: draft.name,
        description: draft.description,
        images: draft.images,
        categoryId: draft.categoryId || undefined,
        variants: draft.variants.map((v) => ({
          size: v.size,
          color: v.color,
          colorCode: v.colorCode,
          additionalPrice: v.additionalPrice,
          stockQuantity: v.stockQuantity,
          sku: v.sku,
        })),
        basePrice: draft.basePrice,
        salePrice: draft.salePrice,
        isFeatured: draft.isFeatured,
        isNewArrival: draft.isNewArrival,
        tags: draft.tags,
      };
      const isNew = draft.productId === 'draft-product' || !draft.productId;
      const res = isNew
        ? await createProductApi(payload)
        : await updateProductApi(draft.productId, payload);
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save product');
    }
  }
);

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
  extraReducers: (builder) => {
    builder
      .addCase(loadProductDraft.pending, (state) => {
        state.saving = false;
        state.error = null;
      })
      .addCase(loadProductDraft.fulfilled, (state, action) => {
        state.draft = action.payload;
      })
      .addCase(loadProductDraft.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(saveProductDraft.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveProductDraft.fulfilled, (state, action) => {
        state.saving = false;
        state.draft = action.payload;
      })
      .addCase(saveProductDraft.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const { setField, setVariant, toggleFlag, setSaving, setError, resetDraft } = productFormSlice.actions;
export const selectProductForm = (state: { productForm: ProductFormState }) => state.productForm;
export default productFormSlice.reducer;