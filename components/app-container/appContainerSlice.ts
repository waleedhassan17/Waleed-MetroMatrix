import { createAppSlice } from "../../store/createAppSlice";
import { UserInfo } from "../../models/user";
import { ProviderInfo } from "../../models/provider";
import { me, persistFcmToken } from "../../networks/authcalls/me";
import {
  removeKey,
  KeyForStorage,
  clearAuthData,
  isOnboardingComplete,
  getSelectedRole,
  getData,
  saveSelectedRole,
  setOnboardingComplete,
} from "../../utils/storage_utils/storageUtils";

export interface appContainerSliceState {
  error: string;
  status: "idle" | "loading" | "failed";
  currentUser?: UserInfo | null;
  currentProvider?: ProviderInfo | null;
  userType: "user" | "provider" | null;
  isAppReady: boolean;
  isOnboardingComplete: boolean;
  selectedRole: "user" | "provider" | null;
  selectedProvider: string | null;
}

const initialState: appContainerSliceState = {
  error: "",
  status: "idle",
  currentUser: null,
  currentProvider: null,
  userType: null,
  isAppReady: false,
  isOnboardingComplete: false,
  selectedRole: null,
  selectedProvider: null,
};

export const appContainerSlice = createAppSlice({
  name: "appContainerSlice", // Changed from "appContainer" to match store registration
  initialState,
  reducers: (create) => ({
    // Logout action
    logout: create.reducer((state) => {
      clearAuthData();
      state.currentUser = null;
      state.currentProvider = null;
      state.userType = null;
      state.status = "idle";
    }),

    // Set app ready state
    setAppIsReady: create.reducer((state, action: { payload: boolean }) => {
      state.isAppReady = action.payload;
    }),

    // Set onboarding complete
    setOnboardingStatus: create.reducer((state, action: { payload: boolean }) => {
      state.isOnboardingComplete = action.payload;
      setOnboardingComplete(action.payload);
    }),

    // Set selected role
    setSelectedRole: create.reducer((state, action: { payload: "user" | "provider" }) => {
      state.selectedRole = action.payload;
      state.userType = action.payload;
      saveSelectedRole(action.payload);
    }),

    // Set selected provider
    setSelectedProvider: create.reducer((state, action: { payload: string }) => {
      state.selectedProvider = action.payload;
    }),

    // Load initial state from storage
    loadInitialState: create.asyncThunk(
      async () => {
        const [onboardingStatus, role, userTypeStored, provider] = await Promise.all([
          isOnboardingComplete(),
          getSelectedRole(),
          getData(KeyForStorage.userType),
          getData(KeyForStorage.selectedProvider),
        ]);

        // Type guard to ensure userType is correct type
        const validateUserType = (type: string | null): "user" | "provider" | null => {
          if (type === "user" || type === "provider") {
            return type as "user" | "provider";
          }
          return null;
        };

        // Type guard for selectedRole
        const validateRole = (role: string | null): "user" | "provider" | null => {
          if (role === "user" || role === "provider") {
            return role as "user" | "provider";
          }
          return null;
        };

        return {
          isOnboardingComplete: onboardingStatus,
          selectedRole: validateRole(role),
          userType: validateUserType(userTypeStored),
          selectedProvider: provider,
        };
      },
      {
        pending: (state) => {
          state.status = "loading";
        },
        fulfilled: (state, action) => {
          state.status = "idle";
          state.isOnboardingComplete = action.payload.isOnboardingComplete;
          state.selectedRole = action.payload.selectedRole;
          state.userType = action.payload.userType;
          state.selectedProvider = action.payload.selectedProvider;
        },
        rejected: (state, action) => {
          state.status = "failed";
          state.error = action.error.message || "Failed to load initial state";
        },
      }
    ),

    // Fetch current user/provider
    fetchMe: create.asyncThunk(
      async (_, { getState }) => {
        const state = getState() as { appContainer: appContainerSliceState };
        const storedUserType = await getData(KeyForStorage.userType);
        
        // Validate and use userType
        const userType = state.appContainer?.userType || 
                        (storedUserType === "provider" ? "provider" : "user");
        
        // ============================================
        // 🧪 TEST MODE - API COMMENTED OUT (START)
        // ============================================
        // REMOVE THIS SECTION AND UNCOMMENT ORIGINAL API CODE BELOW TO RESTORE
        
        console.log('🧪 TEST MODE: Skipping me() API call');
        
        // Return mock data instead of calling API
        return {
          data: null,
          userType: userType as "user" | "provider",
        };
        
        // ============================================
        // 🧪 TEST MODE - API COMMENTED OUT (END)
        // ============================================
        // REMOVE ABOVE SECTION AND UNCOMMENT BELOW TO RESTORE
        
        /* ORIGINAL API CODE - COMMENTED OUT
        // Call appropriate API based on user type
        const result = await me(userType === "provider" ? "provider" : "user");
        
        return {
          data: result,
          userType: userType as "user" | "provider",
        };
        */
      },
      {
        pending: (state) => {
          state.status = "loading";
        },
        fulfilled: (state, action) => {
          state.status = "idle";
          
          // 🧪 TEST MODE: Handle null data from mocked API
          if (action.payload.data) {
            if (action.payload.userType === "provider") {
              // Type assertion since we know it's ProviderInfo when userType is "provider"
              state.currentProvider = action.payload.data as ProviderInfo;
              state.currentUser = null;
            } else {
              // Type assertion since we know it's UserInfo when userType is "user"
              state.currentUser = action.payload.data as UserInfo;
              state.currentProvider = null;
            }
          }
          
          state.userType = action.payload.userType;
          state.isAppReady = true;
        },
        rejected: (state, action) => {
          state.status = "failed";
          state.error = action.error.message || "Failed to fetch user";
          state.isAppReady = true;
          console.log("error rejected ", action.error);
        },
      }
    ),

    // Persist FCM token
    persistFcmTokenAction: create.asyncThunk(
      async ({ fcmToken, deviceType }: { fcmToken: string; deviceType: string }) => {
        // 🧪 TEST MODE: Skip FCM token API call
        console.log('🧪 TEST MODE: Skipping persistFcmToken API call');
        return { success: true };
        
        /* ORIGINAL API CODE - COMMENTED OUT
        return await persistFcmToken(fcmToken, deviceType);
        */
      },
      {
        pending: (state) => {},
        fulfilled: (state, action) => {
          console.log("FCM token persisted successfully (test mode)");
        },
        rejected: (state, error) => {
          console.log("Failed to persist FCM token", error);
        },
      }
    ),

    // Set user after successful authentication
    setCurrentUser: create.reducer((state, action: { payload: UserInfo }) => {
      state.currentUser = action.payload;
      state.currentProvider = null;
      state.userType = "user";
    }),

    // Set provider after successful authentication
    setCurrentProvider: create.reducer((state, action: { payload: ProviderInfo }) => {
      state.currentProvider = action.payload;
      state.currentUser = null;
      state.userType = "provider";
    }),

    // Clear error
    clearError: create.reducer((state) => {
      state.error = "";
    }),
  }),

  selectors: {
    selectStatus: (state) => state.status,
    selectError: (state) => state.error,
    selectIsAppReady: (state) => state.isAppReady,
    selectCurrentUser: (state) => state.currentUser,
    selectCurrentProvider: (state) => state.currentProvider,
    selectUserType: (state) => state.userType,
    selectIsAuthenticated: (state) => !!(state.currentUser || state.currentProvider),
    selectIsOnboardingComplete: (state) => state.isOnboardingComplete,
    selectSelectedRole: (state) => state.selectedRole,
    selectSelectedProvider: (state) => state.selectedProvider,
  },
});

export const {
  logout,
  fetchMe,
  persistFcmTokenAction,
  setAppIsReady,
  setOnboardingStatus,
  setSelectedRole,
  setSelectedProvider,
  loadInitialState,
  setCurrentUser,
  setCurrentProvider,
  clearError,
} = appContainerSlice.actions;

export const {
  selectStatus,
  selectError,
  selectCurrentUser,
  selectCurrentProvider,
  selectUserType,
  selectIsAppReady,
  selectIsAuthenticated,
  selectIsOnboardingComplete,
  selectSelectedRole,
  selectSelectedProvider,
} = appContainerSlice.selectors;