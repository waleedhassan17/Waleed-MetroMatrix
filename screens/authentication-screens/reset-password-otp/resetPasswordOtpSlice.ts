import type { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "../../../store/createAppSlice";
import { verifyResetOTPAPI, resendResetOTPAPI } from "../../../networks/authcalls/forgetPassword";

type UserType = 'user' | 'provider';

interface ResetPasswordOTPSliceState {
  email: string;
  userType: UserType;
  otp: string[];  // Array of 6 digits for OTP input
  resetToken: string;
  resendTimer: number;
  attemptsRemaining: number;
  error: string;
  status: "idle" | "loading" | "succeeded" | "failed";
  resendStatus: "idle" | "loading" | "succeeded" | "failed";
}

const initialState: ResetPasswordOTPSliceState = {
  email: "",
  userType: "user",
  otp: ["", "", "", "", "", ""],  // 6-digit OTP
  resetToken: "",
  resendTimer: 60,  // 60 seconds countdown
  attemptsRemaining: 5,
  error: "",
  status: "idle",
  resendStatus: "idle",
};

export const resetPasswordOtpSlice = createAppSlice({
  name: "resetPasswordOtp",
  initialState,
  reducers: (create) => ({
    setEmail: create.reducer((state, action: PayloadAction<string>) => {
      state.email = action.payload;
    }),

    setUserType: create.reducer((state, action: PayloadAction<UserType>) => {
      state.userType = action.payload;
    }),

    setOtpDigit: create.reducer((state, action: PayloadAction<{ index: number; value: string }>) => {
      const { index, value } = action.payload;
      if (index >= 0 && index < 6) {
        // Only allow single digit
        state.otp[index] = value.slice(-1);
      }
      // Clear error when user types
      if (state.error) {
        state.error = "";
      }
    }),

    setFullOtp: create.reducer((state, action: PayloadAction<string>) => {
      // For paste functionality - set all 6 digits at once
      const otp = action.payload.replace(/\D/g, '').slice(0, 6);
      state.otp = otp.split('').concat(['', '', '', '', '', '']).slice(0, 6);
      if (state.error) {
        state.error = "";
      }
    }),

    clearOtp: create.reducer((state) => {
      state.otp = ["", "", "", "", "", ""];
    }),

    decrementResendTimer: create.reducer((state) => {
      if (state.resendTimer > 0) {
        state.resendTimer -= 1;
      }
    }),

    resetResendTimer: create.reducer((state) => {
      state.resendTimer = 60;
    }),

    clearError: create.reducer((state) => {
      state.error = "";
    }),

    resetForm: create.reducer((state) => {
      state.otp = ["", "", "", "", "", ""];
      state.resetToken = "";
      state.error = "";
      state.status = "idle";
      state.resendStatus = "idle";
      state.resendTimer = 60;
      state.attemptsRemaining = 5;
    }),

    resetAll: create.reducer(() => initialState),

    /**
     * Verify OTP and get reset token
     * POST /api/auth/verify-reset-otp
     */
    verifyOtpAsync: create.asyncThunk(
      async (
        { email, otp, userType }: { email: string; otp: string; userType: UserType },
        { rejectWithValue }
      ) => {
        console.log("📤 verifyOtpAsync started with:", { email, otp: otp.replace(/./g, '*') });

        try {
          const result = await verifyResetOTPAPI({
            email: email.trim(),
            otp: otp.trim(),
            userType,
          });

          console.log("📥 verifyOtpAsync received result:", {
            success: result.success,
            hasResetToken: !!result.resetToken,
          });

          return result;
        } catch (error: any) {
          console.log("❌ verifyOtpAsync caught error:", error.message);
          return rejectWithValue(error.message || "Invalid OTP");
        }
      },
      {
        pending: (state) => {
          console.log("⏳ Verify OTP pending...");
          state.status = "loading";
          state.error = "";
        },
        fulfilled: (state, action) => {
          console.log("✅ Verify OTP fulfilled");
          state.status = "succeeded";
          state.error = "";
          state.resetToken = action.payload.resetToken;
        },
        rejected: (state, action) => {
          console.log("❌ Verify OTP rejected:", action.payload);
          state.status = "failed";
          state.error = (action.payload as string) || "Invalid OTP";
          state.attemptsRemaining = Math.max(0, state.attemptsRemaining - 1);
        },
      }
    ),

    /**
     * Resend OTP
     * POST /api/auth/resend-reset-otp
     */
    resendOtpAsync: create.asyncThunk(
      async (
        { email, userType }: { email: string; userType: UserType },
        { rejectWithValue }
      ) => {
        console.log("📤 resendOtpAsync started for:", email);

        try {
          const result = await resendResetOTPAPI({
            email: email.trim(),
            userType,
          });

          console.log("📥 resendOtpAsync received result:", result);

          return result;
        } catch (error: any) {
          console.log("❌ resendOtpAsync caught error:", error.message);
          return rejectWithValue(error.message || "Failed to resend OTP");
        }
      },
      {
        pending: (state) => {
          console.log("⏳ Resend OTP pending...");
          state.resendStatus = "loading";
        },
        fulfilled: (state) => {
          console.log("✅ Resend OTP fulfilled");
          state.resendStatus = "succeeded";
          state.resendTimer = 60;
          state.otp = ["", "", "", "", "", ""];
          state.error = "";
        },
        rejected: (state, action) => {
          console.log("❌ Resend OTP rejected:", action.payload);
          state.resendStatus = "failed";
          state.error = (action.payload as string) || "Failed to resend OTP";
        },
      }
    ),
  }),

  selectors: {
    selectEmail: (state) => state.email,
    selectUserType: (state) => state.userType,
    selectOtp: (state) => state.otp,
    selectOtpString: (state) => state.otp.join(''),
    selectResetToken: (state) => state.resetToken,
    selectResendTimer: (state) => state.resendTimer,
    selectAttemptsRemaining: (state) => state.attemptsRemaining,
    selectError: (state) => state.error,
    selectStatus: (state) => state.status,
    selectResendStatus: (state) => state.resendStatus,
    selectIsLoading: (state) => state.status === "loading",
    selectIsResending: (state) => state.resendStatus === "loading",
    selectCanResend: (state) => state.resendTimer === 0 && state.resendStatus !== "loading",
    selectIsOtpComplete: (state) => state.otp.every((digit) => digit !== ""),
    selectCanSubmit: (state) => 
      state.otp.every((digit) => digit !== "") && 
      state.status !== "loading" &&
      state.attemptsRemaining > 0,
  },
});

export const {
  setEmail,
  setUserType,
  setOtpDigit,
  setFullOtp,
  clearOtp,
  decrementResendTimer,
  resetResendTimer,
  clearError,
  resetForm,
  resetAll,
  verifyOtpAsync,
  resendOtpAsync,
} = resetPasswordOtpSlice.actions;

export const {
  selectEmail,
  selectUserType,
  selectOtp,
  selectOtpString,
  selectResetToken,
  selectResendTimer,
  selectAttemptsRemaining,
  selectError,
  selectStatus,
  selectResendStatus,
  selectIsLoading,
  selectIsResending,
  selectCanResend,
  selectIsOtpComplete,
  selectCanSubmit,
} = resetPasswordOtpSlice.selectors;

export default resetPasswordOtpSlice.reducer;
