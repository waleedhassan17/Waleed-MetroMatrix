// store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import { roleSlice } from "../screens/role-selection/roleSlice";
import { providerSlice } from "../screens/provider-selection/providerSlice"
import { signInSlice } from "../screens/user-authentication/signin-screen/signinSlice"; 
import { signUpSlice } from "../screens/user-authentication/signup-screen/signupSlice";
import { completeProfileSlice } from "../screens/authentication-screens/profile-info/completeProfileSlice";
import {  providerSignInSlice } from "../screens/provider-authentication/signin-screen/signinSlice";
import { providerSignUpSlice } from "../screens/provider-authentication/signup-screen/signupSlice"
import { personalInfoSlice } from "../screens/authentication-screens/provider-info/personalInfoSlice";
import { appContainerSlice } from "../components/app-container/appContainerSlice";
import { forgotPasswordSlice } from "../screens/authentication-screens/forget-password/forgetPasswordSlice";
import { resetPasswordSlice } from "../screens/authentication-screens/reset-password/resetPasswordSlice";
import { resetPasswordOtpSlice } from "../screens/authentication-screens/reset-password-otp/resetPasswordOtpSlice";
import { emailVerificationSlice } from "../screens/authentication-screens/email-verification/emailVerificationSlice";

import { adminSlice } from "../screens/admin/admin-dashboard/adminSlice";
import { providerApprovalSlice } from "../screens/authentication-screens/provider-approval-pending/providerApprovalSlice";
import userHomeReducer from "../screens/user-home/userhomeSlice";
import userManagementReducer from "../screens/admin/user-management/userManagementSlice";
import providerManagementReducer from "../screens/admin/provider-management/providerManagementSlice";
import pendingReviewReducer from "../screens/admin/pending-review/pendingReviewSlice";
import notificationsReducer from "../screens/admin/notifications/notificationSlice";
import settingsReducer from "../screens/admin/settings/settingsSlice";
import homeServiceBookingsReducer from "../screens/user/homeservice/tabs/booking-screen/bookingSlice";
import serviceProvidersReducer from "../screens/user/homeservice/service-providers/providersSlice";
import homeReducer from "../screens/user/homeservice/tabs/home-screen/homeSlice";
import providerProfileReducer from "../screens/user/homeservice/provider-profile/providerProfileSlice";
import bookingReducer from "../screens/user/homeservice/Booking/bookingScreenSlice";
import bookConfirmationReducer from "../screens/user/homeservice/book-confirmation/bookConfirmationSlice";
import liveTrackingReducer from "../screens/user/homeservice/live-tracking/liveTrackingSlice";
import serviceStatusReducer from "../screens/user/homeservice/service-status/serviceSlice";
import paymentReducer from "../screens/user/homeservice/payment-screen/paymentSlice";
import reviewRatingReducer from "../screens/user/homeservice/rating-screen/ratingSlice";

// Provider HomeService slices
import providerDashboardReducer from "../screens/providers/homeservice/tabs/dashboard/dashboardSlice";
import providerJobsReducer from "../screens/providers/homeservice/tabs/jobs/jobSlice";
import providerEarningsReducer from "../screens/providers/homeservice/tabs/earnings/earningSlice";
import providerHomeProfileReducer from "../screens/providers/homeservice/profie-screen/profileSlice";

export const store = configureStore({
  reducer: {
    role: roleSlice.reducer,
    provider: providerSlice.reducer,
    signIn: signInSlice.reducer,
    providerSignIn: providerSignInSlice.reducer,
    providerSignUp: providerSignUpSlice.reducer,
    signUp: signUpSlice.reducer,
    completeProfile: completeProfileSlice.reducer,
    personalInfo: personalInfoSlice.reducer,
    appContainer: appContainerSlice.reducer,
    forgotPassword: forgotPasswordSlice.reducer,
    resetPassword: resetPasswordSlice.reducer,
    resetPasswordOtp: resetPasswordOtpSlice.reducer,
    emailVerification: emailVerificationSlice.reducer,
    admin: adminSlice.reducer,
    userManagement: userManagementReducer,
    providerManagement: providerManagementReducer,
    pendingReview: pendingReviewReducer,
    notifications: notificationsReducer,
    settings: settingsReducer,
    providerApproval: providerApprovalSlice.reducer,
    userHome: userHomeReducer,
    homeServiceBookings: homeServiceBookingsReducer,
    serviceProviders: serviceProvidersReducer,
    home: homeReducer,
    providerProfile: providerProfileReducer,
    booking: bookingReducer,
    bookConfirmation: bookConfirmationReducer,
    liveTracking: liveTrackingReducer,
    serviceStatus: serviceStatusReducer,
    payment: paymentReducer,
    reviewRating: reviewRatingReducer,
    // Provider HomeService reducers
    dashboard: providerDashboardReducer,
    jobs: providerJobsReducer,
    earnings: providerEarningsReducer,
    profile: providerHomeProfileReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;