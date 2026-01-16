import type { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "../../../store/createAppSlice";
import { checkProviderApprovalStatus } from "../../../networks/authcalls/providerProfile";
import { saveData, KeyForStorage, retrieveData } from "../../../utils/storage_utils/storageUtils";

type ApprovalStatus = "pending_review" | "approved" | "rejected";

interface ProviderApprovalState {
  email: string | null;
  submissionId: string | null;
  status: ApprovalStatus;
  rejectionReason: string | null;
  checkingStatus: boolean;
  error: string;
  lastChecked: number | null;
}

const initialState: ProviderApprovalState = {
  email: null,
  submissionId: null,
  status: "pending_review",
  rejectionReason: null,
  checkingStatus: false,
  error: "",
  lastChecked: null,
};

export const providerApprovalSlice = createAppSlice({
  name: "providerApproval",
  initialState,
  reducers: (create) => ({
    setEmail: create.reducer((state, action: PayloadAction<string>) => {
      state.email = action.payload;
    }),

    setSubmissionId: create.reducer((state, action: PayloadAction<string>) => {
      state.submissionId = action.payload;
    }),

    setStatus: create.reducer((state, action: PayloadAction<ApprovalStatus>) => {
      state.status = action.payload;
    }),

    setCheckingStatus: create.reducer((state, action: PayloadAction<boolean>) => {
      state.checkingStatus = action.payload;
    }),

    setError: create.reducer((state, action: PayloadAction<string>) => {
      state.error = action.payload;
    }),

    clearError: create.reducer((state) => {
      state.error = "";
    }),

    setLastChecked: create.reducer((state, action: PayloadAction<number>) => {
      state.lastChecked = action.payload;
    }),

    // ✅ NEW: Check provider submission status with admin
    // No authentication required - just check by email
    checkProviderApprovalAsync: create.asyncThunk(
      async (
        { email }: { email: string },
        { rejectWithValue }
      ) => {
        try {
          console.log("📤 Checking provider submission status for:", email);

          // Call GET /api/admin/provider-submissions/check-status?email=xxx
          const result = await checkProviderApprovalStatus(email);

          console.log("✅ Submission status received:", result);
          console.log("📊 Status:", result.status);
          console.log("📊 Provider:", result.provider);

          // If approved, update approval status in storage
          if (result.status === "approved" || result.provider?.adminVerified === 'active') {
            console.log("🎉 Provider approved!");
            await saveData(KeyForStorage.providerApprovalStatus, 'approved');
            console.log("✅ Approval status saved");
          } else if (result.status === "rejected" || result.provider?.adminVerified === 'inactive') {
            console.log("❌ Provider rejected");
            await saveData(KeyForStorage.providerApprovalStatus, 'rejected');
          } else {
            console.log("⏳ Provider approval pending");
            await saveData(KeyForStorage.providerApprovalStatus, 'pending');
          }

          return {
            status: result.status as ApprovalStatus,
            submissionId: null, // Not returned by v64 API
            rejectionReason: result.rejectionReason || null,
            message: result.message,
            hasFullToken: false, // Tokens obtained via login after approval
          };
        } catch (error: any) {
          console.error("❌ Check approval error:", error);
          return rejectWithValue(
            error.message || "Failed to check approval status"
          );
        }
      },
      {
        pending: (state) => {
          state.checkingStatus = true;
          state.error = "";
        },
        fulfilled: (state, action) => {
          state.checkingStatus = false;
          state.status = action.payload.status;
          state.rejectionReason = action.payload.rejectionReason;
          state.submissionId = action.payload.submissionId;
          state.lastChecked = Date.now();
          state.error = "";
        },
        rejected: (state, action) => {
          state.checkingStatus = false;
          state.error = (action.payload as string) || "Failed to check status";
        },
      }
    ),

    resetApprovalState: create.reducer((state) => {
      state.email = null;
      state.submissionId = null;
      state.status = "pending_review";
      state.rejectionReason = null;
      state.checkingStatus = false;
      state.error = "";
      state.lastChecked = null;
    }),
  }),

  selectors: {
    selectEmail: (state) => state.email,
    selectSubmissionId: (state) => state.submissionId,
    selectApprovalStatus: (state) => state.status,
    selectRejectionReason: (state) => state.rejectionReason,
    selectIsChecking: (state) => state.checkingStatus,
    selectApprovalError: (state) => state.error,
    selectLastChecked: (state) => state.lastChecked,
    selectIsApproved: (state) => state.status === "approved",
    selectIsRejected: (state) => state.status === "rejected",
    selectIsPending: (state) => state.status === "pending_review",
  },
});

export const {
  setEmail,
  setSubmissionId,
  setStatus,
  setCheckingStatus,
  setError,
  clearError,
  setLastChecked,
  checkProviderApprovalAsync,
  resetApprovalState,
} = providerApprovalSlice.actions;

export const {
  selectEmail,
  selectSubmissionId,
  selectApprovalStatus,
  selectRejectionReason,
  selectIsChecking,
  selectApprovalError,
  selectLastChecked,
  selectIsApproved,
  selectIsRejected,
  selectIsPending,
} = providerApprovalSlice.selectors;
