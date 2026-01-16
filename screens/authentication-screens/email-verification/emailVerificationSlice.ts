import type { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "../../../store/createAppSlice";
import { 
  resendVerificationEmailAPI,
  verifyEmailTokenAPI,
  checkVerificationStatusAPI,
  verifyEmailProgrammaticAPI,
  CheckVerificationStatusResponse,
} from "../../../networks/authcalls/emailVerification";
import { saveData, removeData, KeyForStorage, retrieveData } from "../../../utils/storage_utils/storageUtils";

type VerificationType = "email_verification";
type VerificationStatus = "pending" | "verified" | "failed";
type UserType = "user" | "provider";
type TokenType = "LIMITED" | "FULL";

// ✅ Extended response type for internal use with auto-login fields
interface ExtendedVerificationStatusResponse extends CheckVerificationStatusResponse {
  autoLoginUsed?: boolean;
  autoLoginFailed?: boolean;
  autoLoginError?: string;
  noCredentialsForAutoLogin?: boolean;
  autoLoginUserType?: 'user' | 'provider';
  skipAutoLoginForProvider?: boolean;
  providerLimitedToken?: boolean; // Provider got LIMITED token after email verification
}

interface EmailVerificationSliceState {
  email: string;
  verificationType: VerificationType;
  userType: UserType | null;
  verificationStatus: VerificationStatus;
  resendTimer: number;
  error: string;
  status: "idle" | "loading" | "succeeded" | "failed";
  verificationToken: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: TokenType | null; // LIMITED or FULL - for provider two-tier auth
  autoLoginInProgress: boolean;
  autoLoginError: string | null;
  providerVerifiedNoLogin: boolean; // Provider verified but skipped auto-login
  providerLimitedToken: boolean; // Provider has LIMITED token (needs to submit profile)
}

const initialState: EmailVerificationSliceState = {
  email: "",
  verificationType: "email_verification",
  userType: null,
  verificationStatus: "pending",
  resendTimer: 0,
  error: "",
  status: "idle",
  verificationToken: null,
  accessToken: null,
  refreshToken: null,
  tokenType: null,
  autoLoginInProgress: false,
  autoLoginError: null,
  providerVerifiedNoLogin: false,
  providerLimitedToken: false,
};

/**
 * ✅ FIX: Helper to validate token before saving
 */
const isValidToken = (token: any): boolean => {
  if (!token || token === null || token === undefined) return false;
  if (typeof token !== 'string') return false;
  if (token === 'null' || token === 'undefined' || token.trim() === '') return false;
  if (token.length < 10) return false;
  return true;
};

/**
 * ✅ Helper to save authentication data
 * @param payload - The authentication response containing tokens and user/provider data
 * @param userType - 'user' or 'provider'
 * @param tokenType - 'LIMITED' or 'FULL' (for provider two-tier auth)
 */
const saveAuthenticationData = async (
  payload: any,
  userType: UserType | null,
  tokenType?: 'LIMITED' | 'FULL'
): Promise<boolean> => {
  console.log("💾 saveAuthenticationData called");
  console.log("📊 Payload keys:", Object.keys(payload));
  console.log("📊 Token type:", tokenType || 'FULL');
  
  if (!isValidToken(payload.accessToken)) {
    console.error("❌ Invalid access token, cannot save:", payload.accessToken);
    return false;
  }
  
  try {
    console.log("💾 Saving accessToken to storage...");
    
    const tokenSaved = await saveData(KeyForStorage.accessToken, payload.accessToken);
    if (!tokenSaved) {
      console.error("❌ Failed to save access token to storage");
      return false;
    }
    console.log("✅ Access token saved to storage");

    if (isValidToken(payload.refreshToken)) {
      await saveData(KeyForStorage.refreshToken, payload.refreshToken);
      console.log("✅ Refresh token saved to storage");
    }

    // Save token type (for provider two-tier authentication)
    const effectiveTokenType = tokenType || payload.tokenType || 'FULL';
    await saveData(KeyForStorage.tokenType, effectiveTokenType);
    console.log("✅ Token type saved:", effectiveTokenType);

    // Save onboarding status if present (for providers)
    if (payload.onboardingStatus) {
      await saveData(KeyForStorage.providerApprovalStatus, payload.onboardingStatus);
      console.log("✅ Provider onboarding status saved:", payload.onboardingStatus);
    }

    // Save user/provider info
    if (payload.provider) {
      await saveData(KeyForStorage.userInfo, payload.provider);
      await saveData(KeyForStorage.userType, 'provider');
      await saveData(KeyForStorage.providerAccessToken, payload.accessToken);
      console.log("👤 Saved provider info and set userType to 'provider'");
    } else if (payload.user) {
      await saveData(KeyForStorage.userInfo, payload.user);
      await saveData(KeyForStorage.userType, 'user');
      console.log("👤 Saved user info and set userType to 'user'");
    }

    // Mark as authenticated (but note: LIMITED token means limited access)
    await saveData(KeyForStorage.isAuthenticated, true);
    console.log("✅ Authentication status saved");

    // Remove temporary credentials
    await removeData('tempPassword');
    await removeData('tempEmail');
    await removeData('tempUserType');
    console.log("🧹 Temp credentials cleared");

    console.log("✅ All authentication data saved successfully");
    return true;
  } catch (error) {
    console.error("❌ Error saving authentication data:", error);
    return false;
  }
};

export const emailVerificationSlice = createAppSlice({
  name: "emailVerification",
  initialState,
  reducers: (create) => ({
    setEmail: create.reducer((state, action: PayloadAction<string>) => {
      state.email = action.payload;
    }),
    setVerificationType: create.reducer((state, action: PayloadAction<VerificationType>) => {
      state.verificationType = action.payload;
    }),
    setUserType: create.reducer((state, action: PayloadAction<UserType>) => {
      state.userType = action.payload;
    }),
    setVerificationStatus: create.reducer((state, action: PayloadAction<VerificationStatus>) => {
      state.verificationStatus = action.payload;
    }),
    setResendTimer: create.reducer((state, action: PayloadAction<number>) => {
      state.resendTimer = action.payload;
    }),
    decrementResendTimer: create.reducer((state) => {
      if (state.resendTimer > 0) {
        state.resendTimer -= 1;
      }
    }),
    clearError: create.reducer((state) => {
      state.error = "";
      state.autoLoginError = null;
    }),
    setVerificationToken: create.reducer((state, action: PayloadAction<string>) => {
      state.verificationToken = action.payload;
    }),
    setTokens: create.reducer((state, action: PayloadAction<{ accessToken: string; refreshToken?: string }>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken || null;
    }),
    setAutoLoginInProgress: create.reducer((state, action: PayloadAction<boolean>) => {
      state.autoLoginInProgress = action.payload;
    }),
    resetForm: create.reducer((state) => {
      state.email = "";
      state.verificationType = "email_verification";
      state.userType = null;
      state.verificationStatus = "pending";
      state.resendTimer = 0;
      state.error = "";
      state.status = "idle";
      state.verificationToken = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.tokenType = null;
      state.autoLoginInProgress = false;
      state.autoLoginError = null;
      state.providerVerifiedNoLogin = false;
      state.providerLimitedToken = false;
    }),

    // Resend verification email
    resendVerificationEmailAsync: create.asyncThunk(
      async (
        { email, verificationType, userType }: { 
          email: string; 
          verificationType: VerificationType;
          userType?: UserType;
        }, 
        { rejectWithValue }
      ) => {
        console.log("📤 Resending verification email:", { email, userType });
        
        try {
          const result = await resendVerificationEmailAPI({ 
            email: email.trim(),
            userType
          });
          
          console.log("✅ Verification email resent");
          return result;
        } catch (error: any) {
          console.log("❌ Resend error:", error.message);
          return rejectWithValue(error.message || "Failed to resend email");
        }
      },
      {
        pending: (state) => {
          state.status = "loading";
          state.error = "";
        },
        fulfilled: (state) => {
          state.status = "succeeded";
          state.error = "";
          state.resendTimer = 60;
          console.log("✅ Resend successful");
        },
        rejected: (state, action) => {
          state.status = "failed";
          state.error = (action.payload as string) || "Failed to resend email";
        },
      }
    ),

    // Verify email token (when deep link passes token directly)
    // For providers: Backend returns LIMITED token - they can only submit profile
    // For users: Backend returns FULL token - they have full access
    verifyEmailAsync: create.asyncThunk(
      async (
        { token, userType }: { 
          token: string;
          userType?: UserType;
        }, 
        { rejectWithValue }
      ) => {
        console.log("📤 Verifying email with token, userType:", userType);
        
        try {
          // Try programmatic endpoint first
          try {
            const result = await verifyEmailProgrammaticAPI({
              token,
              userType: userType || 'user',
            });
            
            console.log("✅ Email verified successfully using programmatic endpoint");
            console.log("📊 Token type received:", result.tokenType || 'FULL');
            
            if (result.accessToken) {
              console.log("💾 Saving auth data from verifyEmailAsync...");
              const tokenType = result.tokenType || (userType === 'provider' ? 'LIMITED' : 'FULL');
              await saveAuthenticationData(result, userType || 'user', tokenType);
            }
            
            return result;
          } catch (programmaticError: any) {
            console.warn("⚠️ Programmatic endpoint failed, falling back to token API", programmaticError.message);
            
            const result = await verifyEmailTokenAPI({
              token,
              userType: userType || 'user',
            });
            
            console.log("✅ Email verified successfully using token API");
            console.log("📊 Token type received:", result.tokenType || 'FULL');
            
            if (result.accessToken) {
              console.log("💾 Saving auth data from verifyEmailAsync (fallback)...");
              const tokenType = result.tokenType || (userType === 'provider' ? 'LIMITED' : 'FULL');
              await saveAuthenticationData(result, userType || 'user', tokenType);
            }
            
            return result;
          }
        } catch (error: any) {
          console.log("❌ Email verification error:", error.message);
          return rejectWithValue(error.message || "Failed to verify email");
        }
      },
      {
        pending: (state) => {
          state.status = "loading";
          state.error = "";
        },
        fulfilled: (state, action) => {
          console.log("📤 verifyEmailAsync fulfilled handler triggered");
          console.log("📊 Payload:", JSON.stringify(action.payload, null, 2));
          
          state.status = "succeeded";
          state.error = "";
          state.verificationStatus = "verified";
          
          if (action.payload.isVerified !== false) {
            console.log("✅ isVerified check passed");
            
            if (action.payload.accessToken) {
              state.accessToken = action.payload.accessToken;
              state.refreshToken = action.payload.refreshToken || null;
              state.tokenType = action.payload.tokenType || 'FULL';
              
              if (action.payload.provider) {
                state.userType = 'provider';
                // Check if provider has LIMITED token (needs to submit profile)
                if (action.payload.tokenType === 'LIMITED') {
                  state.providerLimitedToken = true;
                  state.providerVerifiedNoLogin = true; // Navigate to PersonalInfo
                  console.log("👤 Provider got LIMITED token - needs to submit profile");
                }
              } else if (action.payload.user) {
                state.userType = 'user';
              }
            }
            
            console.log("📊 Final state:", {
              verificationStatus: state.verificationStatus,
              status: state.status,
              hasAccessToken: !!state.accessToken,
              userType: state.userType,
              tokenType: state.tokenType,
              providerLimitedToken: state.providerLimitedToken,
            });
          } else {
            state.status = "failed";
            state.verificationStatus = "failed";
            state.error = "Email verification was not confirmed by server";
            console.error("❌ DATA INTEGRITY ERROR: Server did not confirm verification");
          }
        },
        rejected: (state, action) => {
          state.status = "failed";
          state.verificationStatus = "failed";
          state.error = (action.payload as string) || "Failed to verify email";
        },
      }
    ),

    // Check verification status by email - WITH AUTO-LOGIN for signup
    checkVerificationStatusAsync: create.asyncThunk<
      ExtendedVerificationStatusResponse,
      { email: string; userType?: UserType }
    >(
      async (
        { email, userType }, 
        { rejectWithValue }
      ) => {
        console.log("📤 Checking verification status for:", email);
        
        try {
          const result = await checkVerificationStatusAPI({
            email: email.trim(),
            userType: userType || 'user',
          });
          
          console.log("✅ Verification status response:", {
            emailVerified: result.emailVerified,
            hasAccessToken: !!result.accessToken,
            hasRefreshToken: !!result.refreshToken,
            hasUserData: !!(result.user || result.provider),
            tokenType: result.tokenType,
            onboardingStatus: result.onboardingStatus,
            providerEmailVerified: result.provider?.emailVerified, // v64
            providerAdminVerified: result.provider?.adminVerified, // v64
          });
          
          // ✅ v64: Check emailVerified flag from provider object
          const isProviderEmailVerified = result.provider?.emailVerified === 'active';
          const isEmailVerified = result.emailVerified || isProviderEmailVerified;
          
          console.log('🚩 Email verification status:', {
            fromResponse: result.emailVerified,
            fromProviderFlag: isProviderEmailVerified,
            final: isEmailVerified,
          });
          
          // ✅ NEW FLOW: If email is verified and we have tokens (with token type)
          if (isEmailVerified && result.accessToken) {
            console.log("💾 Email verified with tokens! Token type:", result.tokenType || 'FULL');
            const tokenType = result.tokenType || (userType === 'provider' ? 'LIMITED' : 'FULL');
            await saveAuthenticationData(result, userType || 'user', tokenType);
            
            // If provider got LIMITED token, mark for navigation to PersonalInfo
            if (userType === 'provider' && (result.tokenType === 'LIMITED' || result.onboardingStatus === 'pending_profile')) {
              console.log("👤 Provider got LIMITED token - will navigate to PersonalInfo");
              const extendedResult: ExtendedVerificationStatusResponse = {
                ...result,
                providerLimitedToken: true,
                skipAutoLoginForProvider: true, // Legacy flag for navigation
                autoLoginUserType: 'provider',
              };
              return extendedResult;
            }
            
            return result as ExtendedVerificationStatusResponse;
          }
          
          // ✅ If email is verified but NO tokens, trigger auto-login
          if (isEmailVerified && !result.accessToken) {
            console.log("⚠️ Email verified but no tokens...");
            
            // Get temp credentials saved during signup
            const tempEmailRaw = await retrieveData('tempEmail');
            const tempPasswordRaw = await retrieveData('tempPassword');
            const tempUserTypeRaw = await retrieveData('tempUserType') || userType || 'user';
            
            // ✅ CRITICAL FIX: Convert to strings (storage may return numbers for numeric-looking passwords like "12345678")
            const tempEmail = tempEmailRaw ? String(tempEmailRaw).trim().toLowerCase() : null;
            const tempPassword = tempPasswordRaw ? String(tempPasswordRaw) : null;
            const tempUserType = String(tempUserTypeRaw);
            
            console.log("📊 Temp credentials check:", {
              hasEmail: !!tempEmail,
              hasPassword: !!tempPassword,
              userType: tempUserType,
              emailType: typeof tempEmail,
              passwordType: typeof tempPassword,
              rawEmailType: typeof tempEmailRaw,
              rawPasswordType: typeof tempPasswordRaw,
            });

            // ✅ PROVIDER FLOW: Skip auto-login for providers - they need admin approval first
            if (tempUserType === 'provider') {
              console.log("👤 Provider detected - skipping auto-login (admin approval required)");
              console.log("📍 Provider will navigate directly to PersonalInfo screen");
              
              // ✅ IMPORTANT: Save provider password for later use in PersonalInfo submission
              // The personalInfo slice needs this to login before submitting
              if (tempPassword) {
                await saveData(KeyForStorage.providerTempPassword as any, tempPassword);
                console.log("🔑 Provider password saved for PersonalInfo submission");
              }
              if (tempEmail) {
                await saveData(KeyForStorage.providerTempEmail as any, tempEmail);
                console.log("📧 Provider email saved for PersonalInfo submission");
              }
              
              // Clear generic temp credentials
              await removeData('tempEmail');
              await removeData('tempPassword');
              await removeData('tempUserType');
              
              const extendedResult: ExtendedVerificationStatusResponse = {
                ...result,
                skipAutoLoginForProvider: true,
                autoLoginUserType: 'provider',
              };
              return extendedResult;
            }
            
            // ✅ USER FLOW: Auto-login for regular users
            if (tempEmail && tempPassword) {
              console.log("🔐 Found valid temp credentials, performing auto-login for user...");
              
              // Import and call auto-login
              const { autoLogin } = await import('./autoLoginAfterVerification');
              const loginResult = await autoLogin(tempEmail, tempPassword, tempUserType as 'user' | 'provider');
              
              if (loginResult.success) {
                console.log("✅ Auto-login successful!");
                console.log("👤 User type from auto-login:", loginResult.userType);
                
                // Return a modified result with the tokens from auto-login
                const extendedResult: ExtendedVerificationStatusResponse = {
                  ...result,
                  accessToken: loginResult.accessToken,
                  refreshToken: loginResult.refreshToken,
                  autoLoginUsed: true,
                  // ✅ FIX: Include userType from auto-login result
                  autoLoginUserType: loginResult.userType,
                };
                return extendedResult;
              } else {
                console.error("❌ Auto-login failed:", loginResult.message);
                // Return original result - user will need to login manually
                const extendedResult: ExtendedVerificationStatusResponse = {
                  ...result,
                  autoLoginFailed: true,
                  autoLoginError: loginResult.message,
                };
                return extendedResult;
              }
            } else {
              console.warn("⚠️ No temp credentials found for auto-login");
              console.warn("📊 Raw values - Email:", tempEmailRaw, "Password:", tempPasswordRaw);
              // Return result without tokens - navigation will need to handle this
              const extendedResult: ExtendedVerificationStatusResponse = {
                ...result,
                noCredentialsForAutoLogin: true,
              };
              return extendedResult;
            }
          }
          
          return result as ExtendedVerificationStatusResponse;
        } catch (error: any) {
          console.log("❌ Status check error:", error.message);
          return rejectWithValue(error.message || "Failed to check status");
        }
      },
      {
        pending: (state) => {
          state.status = "loading";
          state.error = "";
          state.autoLoginInProgress = true;
        },
        fulfilled: (state, action) => {
          state.status = "succeeded";
          state.error = "";
          state.autoLoginInProgress = false;
          
          const payload = action.payload;
          
          if (payload.emailVerified) {
            state.verificationStatus = "verified";
            console.log("✅ Email is verified");
            
            if (payload.accessToken) {
              state.accessToken = payload.accessToken;
              state.refreshToken = payload.refreshToken || null;
              state.tokenType = (payload.tokenType as 'LIMITED' | 'FULL') || 'FULL';
              
              // ✅ FIX: Check autoLoginUserType first (from auto-login), then fall back to payload.provider/user
              if (payload.autoLoginUserType) {
                state.userType = payload.autoLoginUserType;
                console.log("👤 User type set from auto-login:", payload.autoLoginUserType);
              } else if (payload.provider) {
                state.userType = 'provider';
              } else if (payload.user) {
                state.userType = 'user';
              }
              
              // Check for provider LIMITED token
              if (payload.providerLimitedToken || payload.tokenType === 'LIMITED') {
                state.providerLimitedToken = true;
                state.providerVerifiedNoLogin = true;
                console.log("👤 Provider has LIMITED token - needs to submit profile");
              }
              
              console.log("📊 State updated with tokens:", {
                userType: state.userType,
                tokenType: state.tokenType,
                providerLimitedToken: state.providerLimitedToken,
              });
              
              if (payload.autoLoginUsed) {
                console.log("✅ Tokens obtained via auto-login");
              }
            } else {
              // Email verified but no tokens and auto-login failed or wasn't possible
              if (payload.skipAutoLoginForProvider || payload.providerLimitedToken) {
                // ✅ Provider verified - skip auto-login, navigate to PersonalInfo
                state.providerVerifiedNoLogin = true;
                state.providerLimitedToken = true;
                state.userType = 'provider';
                console.log("✅ Provider email verified - navigate to PersonalInfo (admin approval required)");
              } else if (payload.autoLoginFailed) {
                state.autoLoginError = payload.autoLoginError || "Auto-login failed";
                console.log("⚠️ Email verified but auto-login failed");
              } else if (payload.noCredentialsForAutoLogin) {
                state.autoLoginError = "Please login manually";
                console.log("⚠️ Email verified but no credentials for auto-login");
              } else {
                console.log("⚠️ Email verified but no tokens returned - backend may need update");
              }
            }
          } else {
            state.verificationStatus = "pending";
            state.error = "Email not verified yet. Please check your email and click the verification link.";
            console.log("❌ Email not verified yet");
          }
        },
        rejected: (state, action) => {
          state.status = "failed";
          state.autoLoginInProgress = false;
          state.error = (action.payload as string) || "Failed to check verification status";
        },
      }
    ),

    // Auto-Login After Email Verification
    autoLoginAfterVerificationAsync: create.asyncThunk(
      async (
        { 
          email, 
          password, 
          userType 
        }: { 
          email: string;
          password: string;
          userType: 'user' | 'provider';
        }, 
        { rejectWithValue }
      ) => {
        console.log("📤 autoLoginAfterVerificationAsync started");
        console.log("👤 User type:", userType);
        console.log("📧 Email:", email);

        try {
          // Import auto-login functions
          const { autoLoginUser, autoLoginProvider } = await import('./autoLoginAfterVerification');

          let result;
          if (userType === 'provider') {
            result = await autoLoginProvider(email, password);
          } else {
            result = await autoLoginUser(email, password);
          }

          if (!result.success) {
            console.error("❌ Auto-login failed:", result.message);
            return rejectWithValue(result.message);
          }

          console.log("✅ Auto-login successful");
          console.log("📊 Result:", {
            userType: result.userType,
            hasAccessToken: !!result.accessToken,
            message: result.message,
          });

          return result;
        } catch (error: any) {
          console.error("❌ autoLoginAfterVerificationAsync error:", error.message);
          return rejectWithValue(error.message || "Auto-login failed");
        }
      },
      {
        pending: (state) => {
          console.log("⏳ Auto-login pending...");
          state.status = "loading";
          state.error = "";
          state.autoLoginInProgress = true;
        },
        fulfilled: (state, action) => {
          console.log("✅ Auto-login fulfilled");
          state.status = "succeeded";
          state.error = "";
          state.accessToken = action.payload.accessToken;
          state.refreshToken = action.payload.refreshToken || null;
          state.verificationStatus = "verified";
          state.autoLoginInProgress = false;
          
          console.log("✅ Auto-login state updated");
        },
        rejected: (state, action) => {
          console.log("❌ Auto-login rejected:", action.payload);
          state.status = "failed";
          state.error = (action.payload as string) || "Auto-login failed";
          state.autoLoginInProgress = false;
          state.autoLoginError = (action.payload as string) || "Auto-login failed";
          // Don't change verification status - email is still verified
        },
      }
    ),
  }),

  selectors: {
    selectEmail: (state) => state.email,
    selectVerificationType: (state) => state.verificationType,
    selectUserType: (state) => state.userType,
    selectVerificationStatus: (state) => state.verificationStatus,
    selectResendTimer: (state) => state.resendTimer,
    selectStatus: (state) => state.status,
    selectError: (state) => state.error,
    selectVerificationToken: (state) => state.verificationToken,
    selectAccessToken: (state) => state.accessToken,
    selectRefreshToken: (state) => state.refreshToken,
    selectIsLoading: (state) => state.status === "loading",
    selectIsVerified: (state) => state.verificationStatus === "verified",
    selectCanResend: (state) => state.resendTimer === 0 && state.verificationStatus !== "verified",
    selectAutoLoginInProgress: (state) => state.autoLoginInProgress,
    selectAutoLoginError: (state) => state.autoLoginError,
    selectProviderVerifiedNoLogin: (state) => state.providerVerifiedNoLogin,
    selectTokenType: (state) => state.tokenType,
    selectProviderLimitedToken: (state) => state.providerLimitedToken,
  },
});

export const {
  setEmail,
  setVerificationType,
  setUserType,
  setVerificationStatus,
  setResendTimer,
  decrementResendTimer,
  clearError,
  setVerificationToken,
  setTokens,
  setAutoLoginInProgress,
  resetForm,
  resendVerificationEmailAsync,
  verifyEmailAsync,
  checkVerificationStatusAsync,
  autoLoginAfterVerificationAsync,
} = emailVerificationSlice.actions;

export const {
  selectEmail,
  selectVerificationType,
  selectUserType,
  selectVerificationStatus,
  selectResendTimer,
  selectStatus,
  selectError,
  selectVerificationToken,
  selectAccessToken,
  selectRefreshToken,
  selectIsLoading,
  selectIsVerified,
  selectCanResend,
  selectAutoLoginInProgress,
  selectAutoLoginError,
  selectProviderVerifiedNoLogin,
  selectTokenType,
  selectProviderLimitedToken,
} = emailVerificationSlice.selectors;