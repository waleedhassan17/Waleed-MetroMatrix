import type { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "../../../store/createAppSlice";
import { forgotPasswordAPI } from "../../../networks/authcalls/forgetPassword";

type UserType = 'user' | 'provider';

interface ForgotPasswordSliceState {
  email: string;
  userType: UserType;
  error: string;
  status: "idle" | "loading" | "succeeded" | "failed";
}

const initialState: ForgotPasswordSliceState = {
  email: "",
  userType: "user",
  error: "",
  status: "idle",
};

export const forgotPasswordSlice = createAppSlice({
  name: "forgotPassword",
  initialState,
  reducers: (create) => ({
    setEmail: create.reducer((state, action: PayloadAction<string>) => {
      state.email = action.payload;
      // Clear error when user types
      if (state.error) {
        state.error = "";
      }
    }),
    
    setUserType: create.reducer((state, action: PayloadAction<UserType>) => {
      state.userType = action.payload;
    }),
    
    clearError: create.reducer((state) => {
      state.error = "";
    }),
    
    resetForm: create.reducer((state) => {
      state.email = "";
      state.error = "";
      state.status = "idle";
      // Keep userType intact for navigation purposes
    }),
    
    resetStatus: create.reducer((state) => {
      state.status = "idle";
    }),

    /**
     * Submit forgot password request — calls the reset endpoint directly.
     * POST /api/auth/forgot-password
     * Body: { email, userType }
     *
     * There used to be a `checkEmailExistsAPI` preflight here. The route it
     * called (GET /api/auth/check-email-exists) does not exist on the
     * backend, so it always 404'd, and the helper mapped 404 to
     * "email doesn't exist" — which is why a perfectly real account got
     * "No account found." (task.md Issue 3).
     *
     * The backend now answers every forgot-password request with the same
     * generic success and only mails real accounts, so there is nothing to
     * pre-check: advancing straight to the OTP screen is both correct and
     * the anti-enumeration-safe behaviour.
     */
    submitForgotPasswordAsync: create.asyncThunk(
      async ({ email, userType }: { email: string; userType?: 'user' | 'provider' }, { getState, rejectWithValue }) => {
        console.log("📤 submitForgotPasswordAsync started with:", { email });

        try {
          // Get userType from state if not provided
          const state = getState() as { forgotPassword: { userType: 'user' | 'provider' } };
          const effectiveUserType = userType || state.forgotPassword.userType || 'user';

          const result = await forgotPasswordAPI({
            email: email.trim(),
            userType: effectiveUserType,
          });

          console.log("📥 submitForgotPasswordAsync received result:", JSON.stringify(result, null, 2));

          return {
            email: email.trim(),
            success: result.success,
            message: result.message,
          };
        } catch (error: any) {
          console.log("❌ submitForgotPasswordAsync caught error:", error.message);
          return rejectWithValue(error.message || "Failed to send reset email");
        }
      },
      {
        pending: (state) => {
          console.log("⏳ Forgot password request pending...");
          state.status = "loading";
          state.error = "";
        },
        fulfilled: (state, action) => {
          console.log("✅ Forgot password fulfilled with payload:", JSON.stringify(action.payload, null, 2));
          
          state.status = "succeeded";
          state.error = "";
          
          console.log("💾 Reset email sent successfully to:", action.payload.email);
        },
        rejected: (state, action) => {
          console.log("❌ Forgot password rejected:", action.payload || action.error.message);
          
          state.status = "failed";
          state.error = (action.payload as string) || action.error.message || "Failed to send reset email";
          
          console.log("Error set in state:", state.error);
        },
      }
    ),
  }),

  selectors: {
    selectEmail: (state) => state.email,
    selectUserType: (state) => state.userType,
    selectStatus: (state) => state.status,
    selectError: (state) => state.error,
    selectIsLoading: (state) => state.status === "loading",
    selectIsSucceeded: (state) => state.status === "succeeded",
    selectIsFailed: (state) => state.status === "failed",
    selectIsFormComplete: (state) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return state.email.trim().length > 0 && emailRegex.test(state.email.trim());
    },
  },
});

export const {
  setEmail,
  setUserType,
  clearError,
  resetForm,
  resetStatus,
  submitForgotPasswordAsync,
} = forgotPasswordSlice.actions;

export const {
  selectEmail,
  selectUserType,
  selectStatus,
  selectError,
  selectIsLoading,
  selectIsSucceeded,
  selectIsFailed,
  selectIsFormComplete,
} = forgotPasswordSlice.selectors;