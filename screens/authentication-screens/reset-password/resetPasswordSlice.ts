import type { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "../../../store/createAppSlice";
import { resetPasswordAPI } from "../../../networks/authcalls/forgetPassword";

type UserType = 'user' | 'provider';

interface ResetPasswordSliceState {
  email: string;
  token: string;
  userType: UserType;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  error: string;
  status: "idle" | "loading" | "succeeded" | "failed";
}

const initialState: ResetPasswordSliceState = {
  email: "",
  token: "",
  userType: "user",
  password: "",
  confirmPassword: "",
  showPassword: false,
  showConfirmPassword: false,
  error: "",
  status: "idle",
};

export const resetPasswordSlice = createAppSlice({
  name: "resetPassword",
  initialState,
  reducers: (create) => ({
    setEmail: create.reducer((state, action: PayloadAction<string>) => {
      state.email = action.payload;
    }),
    
    // Updated: renamed from setVerificationToken to setToken for clarity
    setToken: create.reducer((state, action: PayloadAction<string>) => {
      state.token = action.payload;
    }),
    
    // Keep backward compatibility
    setVerificationToken: create.reducer((state, action: PayloadAction<string>) => {
      state.token = action.payload;
    }),
    
    setUserType: create.reducer((state, action: PayloadAction<UserType>) => {
      state.userType = action.payload;
    }),
    
    setPassword: create.reducer((state, action: PayloadAction<string>) => {
      state.password = action.payload;
      // Clear error when user types
      if (state.error) {
        state.error = "";
      }
    }),
    
    setConfirmPassword: create.reducer((state, action: PayloadAction<string>) => {
      state.confirmPassword = action.payload;
      // Clear error when user types
      if (state.error) {
        state.error = "";
      }
    }),
    
    togglePasswordVisibility: create.reducer((state) => {
      state.showPassword = !state.showPassword;
    }),
    
    toggleConfirmPasswordVisibility: create.reducer((state) => {
      state.showConfirmPassword = !state.showConfirmPassword;
    }),
    
    clearError: create.reducer((state) => {
      state.error = "";
    }),
    
    resetForm: create.reducer((state) => {
      state.email = "";
      state.token = "";
      state.password = "";
      state.confirmPassword = "";
      state.showPassword = false;
      state.showConfirmPassword = false;
      state.error = "";
      state.status = "idle";
      // Keep userType for navigation
    }),

    /**
     * Submit reset password request
     * Uses the new API format: { token, password }
     */
    submitResetPasswordAsync: create.asyncThunk(
      async (
        { 
          token, 
          password,
          // Legacy params for backward compatibility
          email,
          verificationToken,
          newPassword,
        }: { 
          token?: string; 
          password?: string;
          // Legacy params
          email?: string;
          verificationToken?: string;
          newPassword?: string;
        }, 
        { rejectWithValue, getState }
      ) => {
        console.log("📤 submitResetPasswordAsync started");
        
        try {
          // Support both new and legacy parameter formats
          const resetToken = token || verificationToken;
          const resetPassword = password || newPassword;
          
          if (!resetToken) {
            throw new Error('Reset token is required');
          }
          
          if (!resetPassword) {
            throw new Error('Password is required');
          }
          
          console.log("🔑 Using token:", resetToken.substring(0, 20) + '...');
          
          const result = await resetPasswordAPI({ 
            resetToken: resetToken,
            password: resetPassword,
          });
          
          console.log("📥 submitResetPasswordAsync received result:", JSON.stringify(result, null, 2));
          
          return result;
        } catch (error: any) {
          console.log("❌ submitResetPasswordAsync caught error:", error.message);
          return rejectWithValue(error.message || "Failed to reset password");
        }
      },
      {
        pending: (state) => {
          console.log("⏳ Reset password pending...");
          state.status = "loading";
          state.error = "";
        },
        fulfilled: (state, action) => {
          console.log("✅ Reset password fulfilled");
          
          state.status = "succeeded";
          state.error = "";
          
          // Clear sensitive data after successful reset
          state.password = "";
          state.confirmPassword = "";
          state.token = "";
          
          console.log("💾 Password reset successfully");
        },
        rejected: (state, action) => {
          console.log("❌ Reset password rejected:", action.payload || action.error.message);
          
          state.status = "failed";
          state.error = (action.payload as string) || action.error.message || "Failed to reset password";
          
          console.log("Error set in state:", state.error);
        },
      }
    ),
  }),

  selectors: {
    selectEmail: (state) => state.email,
    selectToken: (state) => state.token,
    // Backward compatibility
    selectVerificationToken: (state) => state.token,
    selectUserType: (state) => state.userType,
    selectPassword: (state) => state.password,
    selectConfirmPassword: (state) => state.confirmPassword,
    selectShowPassword: (state) => state.showPassword,
    selectShowConfirmPassword: (state) => state.showConfirmPassword,
    selectStatus: (state) => state.status,
    selectError: (state) => state.error,
    selectIsLoading: (state) => state.status === "loading",
    selectIsFormComplete: (state) => 
      state.password.trim().length > 0 && 
      state.confirmPassword.trim().length > 0,
    selectPasswordsMatch: (state) => 
      state.password === state.confirmPassword && state.password.length > 0,
    selectIsPasswordValid: (state) => state.password.length >= 6,
    selectCanSubmit: (state) => 
      state.password.trim().length >= 6 && 
      state.password === state.confirmPassword &&
      state.status !== "loading",
  },
});

export const {
  setEmail,
  setToken,
  setVerificationToken,
  setUserType,
  setPassword,
  setConfirmPassword,
  togglePasswordVisibility,
  toggleConfirmPasswordVisibility,
  clearError,
  resetForm,
  submitResetPasswordAsync,
} = resetPasswordSlice.actions;

export const {
  selectEmail,
  selectToken,
  selectVerificationToken,
  selectUserType,
  selectPassword,
  selectConfirmPassword,
  selectShowPassword,
  selectShowConfirmPassword,
  selectStatus,
  selectError,
  selectIsLoading,
  selectIsFormComplete,
  selectPasswordsMatch,
  selectIsPasswordValid,
  selectCanSubmit,
} = resetPasswordSlice.selectors;