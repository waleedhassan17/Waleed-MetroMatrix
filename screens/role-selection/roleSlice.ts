import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../../store/store";
import { RoleStorage } from "../../utils/role-storage/roleStorage";

// Types
export type UserRole = 'provider' | 'user' | null;

interface RoleSelectionState {
  selectedRole: UserRole;
  isRoleSelected: boolean;
  error: string;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

// Initial State
const initialState: RoleSelectionState = {
  selectedRole: null,
  isRoleSelected: false,
  error: "",
  status: "idle",
};

// Slice
export const roleSlice = createSlice({
  name: "role",
  initialState,
  reducers: {
    setUserRole: (state, action: PayloadAction<UserRole>) => {
      console.log("📝 Setting user role:", action.payload);
      
      state.selectedRole = action.payload;
      state.isRoleSelected = action.payload !== null;
      state.error = "";
      state.status = "succeeded";
      
      // Save role to AsyncStorage
      if (action.payload) {
        RoleStorage.saveRole(action.payload).catch((error) => {
          console.error("Failed to save role to storage:", error);
        });
      }
    },
    
    clearRole: (state) => {
      console.log("🗑️ Clearing user role");
      
      state.selectedRole = null;
      state.isRoleSelected = false;
      state.error = "";
      state.status = "idle";
      
      // Clear role from storage
      RoleStorage.clearRole().catch((error) => {
        console.error("Failed to clear role from storage:", error);
      });
    },
    
    setRoleError: (state, action: PayloadAction<string>) => {
      console.log("❌ Role selection error:", action.payload);
      
      state.error = action.payload;
      state.status = "failed";
    },
    
    clearRoleError: (state) => {
      state.error = "";
    },
    
    resetRoleState: (state) => {
      console.log("🔄 Resetting role state");
      
      state.selectedRole = null;
      state.isRoleSelected = false;
      state.error = "";
      state.status = "idle";
    },
    
    loadRoleFromStorage: (state, action: PayloadAction<UserRole>) => {
      console.log("📥 Loading role from storage:", action.payload);
      
      state.selectedRole = action.payload;
      state.isRoleSelected = action.payload !== null;
      state.status = "succeeded";
    },
  },
});

// Export actions
export const {
  setUserRole,
  clearRole,
  setRoleError,
  clearRoleError,
  resetRoleState,
  loadRoleFromStorage,
} = roleSlice.actions;

// Selectors
export const selectUserRole = (state: RootState) => state.role.selectedRole;
export const selectIsRoleSelected = (state: RootState) => state.role.isRoleSelected;
export const selectRoleError = (state: RootState) => state.role.error;
export const selectRoleStatus = (state: RootState) => state.role.status;
export const selectIsProvider = (state: RootState) => state.role.selectedRole === 'provider';
export const selectIsUser = (state: RootState) => state.role.selectedRole === 'user';

// Export reducer
export default roleSlice.reducer;