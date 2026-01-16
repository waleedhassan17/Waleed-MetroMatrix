import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "../../store/store";
import { ProviderStorage, type ProviderMainType, type HomeServiceSubType } from "../../utils/role-storage/roleStorage";

// Types
interface ProviderSelectionState {
  providerType: ProviderMainType;
  homeServiceSubType: HomeServiceSubType | null; // Changed from array to single value
  isProviderTypeSelected: boolean;
  error: string;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

// Initial State
const initialState: ProviderSelectionState = {
  providerType: null,
  homeServiceSubType: null, // Changed from array to null
  isProviderTypeSelected: false,
  error: "",
  status: "idle",
};

// Async thunk for loading provider selection on app start
export const loadProviderSelectionFromStorage = createAsyncThunk(
  'provider/loadFromStorage',
  async (_, { rejectWithValue }) => {
    try {
      console.log("🔍 Loading provider selection from storage...");
      const selection = await ProviderStorage.loadSelection();
      
      if (selection && selection.providerType) {
        console.log("✅ Provider selection found:", selection);
        return selection;
      } else {
        console.log("ℹ️ No provider selection found in storage");
        return null;
      }
    } catch (error) {
      console.error("❌ Failed to load provider selection:", error);
      return rejectWithValue("Failed to load saved provider selection");
    }
  }
);

// Slice
export const providerSlice = createSlice({
  name: "provider",
  initialState,
  reducers: {
    setProviderType: (state, action: PayloadAction<ProviderMainType>) => {
      console.log("📝 Setting provider type:", action.payload);
      
      state.providerType = action.payload;
      state.isProviderTypeSelected = action.payload !== null;
      state.error = "";
      state.status = "succeeded";
      
      // Clear sub-type if switching away from home_service
      if (action.payload !== 'home_service') {
        state.homeServiceSubType = null;
      }
      
      // Save to AsyncStorage
      if (action.payload) {
        // Convert single subType to array for storage compatibility
        const subTypes = state.homeServiceSubType ? [state.homeServiceSubType] : [];
        ProviderStorage.saveSelection(action.payload, subTypes).catch((error) => {
          console.error("❌ Failed to save provider selection to storage:", error);
          state.error = "Failed to save selection";
        });
      }
    },
    
    // Changed from toggle to set (radio button behavior)
    setProviderSubType: (state, action: PayloadAction<HomeServiceSubType>) => {
      console.log("📝 Setting sub-type:", action.payload);
      
      // Ensure we're working with home_service
      if (state.providerType !== 'home_service') {
        state.providerType = 'home_service';
      }
      
      // Set the single sub-type (replaces previous selection)
      state.homeServiceSubType = action.payload;
      
      // Update selection status
      state.isProviderTypeSelected = true;
      
      // Save to AsyncStorage
      ProviderStorage.saveSelection(state.providerType, [action.payload]).catch((error) => {
        console.error("❌ Failed to save provider selection to storage:", error);
        state.error = "Failed to save selection";
      });
    },
    
    clearProviderSelection: (state) => {
      console.log("🗑️ Clearing provider selection");
      
      state.providerType = null;
      state.homeServiceSubType = null;
      state.isProviderTypeSelected = false;
      state.error = "";
      state.status = "idle";
      
      // Clear from storage
      ProviderStorage.clearSelection().catch((error) => {
        console.error("❌ Failed to clear provider selection from storage:", error);
      });
    },
    
    setProviderError: (state, action: PayloadAction<string>) => {
      console.log("❌ Provider selection error:", action.payload);
      
      state.error = action.payload;
      state.status = "failed";
    },
    
    clearProviderError: (state) => {
      state.error = "";
    },
    
    resetProviderState: (state) => {
      console.log("🔄 Resetting provider state");
      
      state.providerType = null;
      state.homeServiceSubType = null;
      state.isProviderTypeSelected = false;
      state.error = "";
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProviderSelectionFromStorage.pending, (state) => {
        state.status = 'loading';
        state.error = '';
      })
      .addCase(loadProviderSelectionFromStorage.fulfilled, (state, action) => {
        if (action.payload) {
          console.log("📥 Loading provider selection from storage:", action.payload);
          
          state.providerType = action.payload.providerType;
          // Take first subtype if array exists (for backward compatibility)
          state.homeServiceSubType = action.payload.subTypes?.[0] || null;
          
          // Set selection status based on provider type
          if (action.payload.providerType === 'home_service') {
            state.isProviderTypeSelected = state.homeServiceSubType !== null;
          } else {
            state.isProviderTypeSelected = action.payload.providerType !== null;
          }
        }
        state.status = 'succeeded';
      })
      .addCase(loadProviderSelectionFromStorage.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string || 'Failed to load provider selection';
        console.error("❌ Failed to load provider selection:", action.payload);
      });
  },
});

// Export actions
export const {
  setProviderType,
  setProviderSubType, // Changed from toggleProviderSubType
  clearProviderSelection,
  setProviderError,
  clearProviderError,
  resetProviderState,
} = providerSlice.actions;

// Selectors
export const selectProviderType = (state: RootState) => state.provider.providerType;
export const selectProviderSubType = (state: RootState) => state.provider.homeServiceSubType; // Changed from array
export const selectIsProviderTypeSelected = (state: RootState) => state.provider.isProviderTypeSelected;
export const selectProviderError = (state: RootState) => state.provider.error;
export const selectProviderStatus = (state: RootState) => state.provider.status;

// Derived selectors
export const selectIsDoctor = (state: RootState) => state.provider.providerType === 'doctor';
export const selectIsHomeService = (state: RootState) => state.provider.providerType === 'home_service';
export const selectIsVendor = (state: RootState) => state.provider.providerType === 'vendor';
export const selectHasHomeServiceSubType = (state: RootState) => 
  state.provider.providerType === 'home_service' && state.provider.homeServiceSubType !== null;

// Complex selectors
export const selectProviderFullInfo = (state: RootState) => ({
  type: state.provider.providerType,
  subType: state.provider.homeServiceSubType, // Changed from subTypes
  isSelected: state.provider.isProviderTypeSelected,
});

// Export reducer
export default providerSlice.reducer;