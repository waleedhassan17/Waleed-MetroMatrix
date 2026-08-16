import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Product, ProductVariant } from '../../../../types/shopping';
import { createProductApi, updateProductApi, fetchProductByIdApi } from '../../../../networks/shopping/productApi';
import { fetchMyCategoriesApi, createCategoryApi } from '../../../../networks/shopping/vendorApi';
import { swatchColor } from '../../../../constants/ProductColors';

/** Just what the category picker needs; `GET /vendor/categories` returns more. */
export interface VendorCategory {
  categoryId: string;
  name: string;
  parentId?: string | null;
}

export interface SaveError {
  message: string;
  /** Backend error code, e.g. 'NO_BRAND'. */
  code?: string;
}

export interface ProductFormState {
  saving: boolean;
  error: SaveError | null;
  draft: Product;
  categories: VendorCategory[];
  categoriesLoading: boolean;
  categoriesError: string | null;
}

let variantSeq = 0;
/** Local-only id; used as a React key and stripped from the save payload. */
const nextVariantId = () => `local-${(variantSeq += 1)}`;

export const makeEmptyVariant = (): ProductVariant => ({
  variantId: nextVariantId(),
  size: '',
  color: '',
  additionalPrice: 0,
  stockQuantity: 0,
  sku: '',
});

/**
 * A factory, not a shared literal. `resetDraft` used to Object.assign the same
 * module-level object, so every new product started with the identical
 * `SKU-DRAFT` — and the backend rejects duplicate SKUs within a brand, which
 * meant the SECOND product a vendor created always failed.
 */
const makeEmptyDraft = (): Product => ({
  productId: 'draft-product',
  odexId: 'draft-product',
  // The server derives the brand from the authenticated vendor
  // (`req.brand._id`); the old 'brand-1' placeholder was pure fiction.
  brandId: '',
  sku: `SKU-${Date.now().toString(36).toUpperCase()}`,
  name: '',
  description: '',
  images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
  // Was hardcoded to 'cat-apparel' — a made-up slug where the backend needs a
  // Mongo ObjectId, which is what produced the BSONError on every save.
  categoryId: '',
  variants: [makeEmptyVariant()],
  basePrice: 0,
  salePrice: undefined,
  rating: 0,
  totalReviews: 0,
  isFeatured: false,
  isNewArrival: true,
  inStock: false,
  tags: [],
  createdAt: new Date().toISOString(),
});

const initialState: ProductFormState = {
  saving: false,
  error: null,
  draft: makeEmptyDraft(),
  categories: [],
  categoriesLoading: false,
  categoriesError: null,
};

/** Vendor's own categories — the only source of valid categoryIds. */
export const fetchFormCategories = createAsyncThunk(
  'productForm/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchMyCategoriesApi();
      return (res.data ?? []) as VendorCategory[];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load categories');
    }
  }
);

/** First-run helper so a vendor with no categories is not stuck. */
export const createFormCategory = createAsyncThunk(
  'productForm/createCategory',
  async (name: string, { rejectWithValue }) => {
    try {
      const res = await createCategoryApi({ name } as any);
      return res.data as VendorCategory;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create category');
    }
  }
);

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

const slug = (v: string) => v.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Deterministic per-variant SKU derived from the product SKU. */
const variantSku = (productSku: string, v: ProductVariant, i: number) => {
  const parts = [productSku, slug(v.size || ''), slug(v.color || '')].filter(Boolean);
  return parts.length > 1 ? parts.join('-') : `${productSku}-${i + 1}`;
};

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
        variants: draft.variants.map((v, i) => ({
          size: v.size || undefined,
          color: v.color || undefined,
          colorCode: v.color ? swatchColor(v.color, v.colorCode) : undefined,
          additionalPrice: v.additionalPrice || 0,
          stockQuantity: v.stockQuantity || 0,
          // Derived: only product-level SKU uniqueness is enforced, and this
          // keeps a per-variant SKU column off the form.
          sku: v.sku || variantSku(draft.sku, v, i),
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
      return rejectWithValue({
        message: error?.message || 'Failed to save product',
        code: error?.code,
      } as SaveError);
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
    addVariant(state) {
      state.draft.variants.push(makeEmptyVariant());
    },
    updateVariant(
      state,
      action: PayloadAction<{ index: number; key: keyof ProductVariant; value: any }>
    ) {
      const { index, key, value } = action.payload;
      const variant = state.draft.variants[index];
      if (!variant) return;
      (variant as any)[key] = value;
      if (key === 'color') variant.colorCode = value ? swatchColor(value) : undefined;
    },
    removeVariant(state, action: PayloadAction<number>) {
      // A product must keep at least one variant.
      if (state.draft.variants.length <= 1) return;
      state.draft.variants.splice(action.payload, 1);
    },
    // `inStock` is not server-editable — it is derived from variant stock via
    // syncStockFlag(), so it is deliberately absent here.
    toggleFlag(state, action: PayloadAction<'isFeatured' | 'isNewArrival'>) {
      state.draft[action.payload] = !state.draft[action.payload];
    },
    setSaving(state, action: PayloadAction<boolean>) {
      state.saving = action.payload;
    },
    setError(state, action: PayloadAction<SaveError | null>) {
      state.error = action.payload;
    },
    resetDraft(state) {
      state.saving = false;
      state.error = null;
      state.draft = makeEmptyDraft();
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
        state.error = { message: action.payload as string };
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
        state.error = (action.payload as SaveError) ?? { message: 'Failed to save product' };
      })
      .addCase(fetchFormCategories.pending, (state) => {
        state.categoriesLoading = true;
        state.categoriesError = null;
      })
      .addCase(fetchFormCategories.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        state.categories = action.payload;
      })
      .addCase(fetchFormCategories.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError = action.payload as string;
      })
      .addCase(createFormCategory.fulfilled, (state, action) => {
        state.categories.push(action.payload);
        state.draft.categoryId = action.payload.categoryId;
      })
      .addCase(createFormCategory.rejected, (state, action) => {
        state.categoriesError = action.payload as string;
      });
  },
});

export const {
  setField,
  addVariant,
  updateVariant,
  removeVariant,
  toggleFlag,
  setSaving,
  setError,
  resetDraft,
} = productFormSlice.actions;
export const selectProductForm = (state: { productForm: ProductFormState }) => state.productForm;
export default productFormSlice.reducer;