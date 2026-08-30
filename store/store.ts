// store/store.ts
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import favoritesReducer from "../screens/user/homeservice/favorites/favoritesSlice";
import serviceProvidersReducer from "../screens/user/homeservice/service-providers/providersSlice";
import homeReducer from "../screens/user/homeservice/tabs/home-screen/homeSlice";
import providerProfileReducer from "../screens/user/homeservice/provider-profile/providerProfileSlice";
import bookingReducer from "../screens/user/homeservice/Booking/bookingScreenSlice";
import bookConfirmationReducer from "../screens/user/homeservice/book-confirmation/bookConfirmationSlice";
import liveTrackingReducer from "../screens/user/homeservice/live-tracking/liveTrackingSlice";
import serviceStatusReducer from "../screens/user/homeservice/service-status/serviceSlice";
import paymentReducer from "../screens/user/homeservice/payment-screen/paymentSlice";
import reviewRatingReducer from "../screens/user/homeservice/rating-screen/ratingSlice";
import quickSearchReducer from "../screens/user/homeservice/quick-search/quicksearchSlice";
import searchProvidersReducer from "../screens/user/homeservice/search-providers/searchProvidersSlice";

// Provider HomeService slices
import providerDashboardReducer from "../screens/providers/homeservice/tabs/dashboard/dashboardSlice";
import providerJobsReducer from "../screens/providers/homeservice/tabs/jobs/jobSlice";
import providerEarningsReducer from "../screens/providers/homeservice/tabs/earnings/earningSlice";
import providerHomeProfileReducer from "../screens/providers/homeservice/profile-screen/profileSlice";

// Provider Job Flow slices
import jobDetailReducer from "../screens/providers/homeservice/jobdetail-screen/jobDetailSlice";
import navigationMapReducer from "../screens/providers/homeservice/map-screen/mapSlice";
import jobInProgressReducer from "../screens/providers/homeservice/job-InProgress/jobInProgressSlice";
import awaitingApprovalReducer from "../screens/providers/homeservice/awaiting-screen/awaitingScreenSlice";
import paymentRequestReducer from "../screens/providers/homeservice/payment-screen/paymentRequestSlice";
import jobCompletionReducer from "../screens/providers/homeservice/job-completion/jobCompletionSlice";

// Centralized User Features (Shared across all services)
import userProfileReducer from "../screens/user/shared/profile/userProfileSlice";
import { walletSlice } from "../services/wallet";

// Admin Service Providers slices
import adminServiceProvidersDashboardReducer from "../screens/admin/providers/service-providers/tabs/dashboard/dashboardSlice";
import adminServiceProvidersBookingsReducer from "../screens/admin/providers/service-providers/tabs/bookings/bookingsSlice";
import adminServiceProvidersAnalyticsReducer from "../screens/admin/providers/service-providers/tabs/analytics/analyticsSlice";

// Healthcare Patient slices (screens/user/healthcare/)
import healthcareHomeReducer from '../screens/user/healthcare/home/healthcareHomeSlice';
import specialtyListReducer from '../screens/user/healthcare/specialty-list/specialtyListSlice';
import doctorListReducer from '../screens/user/healthcare/doctor-list/doctorListSlice';
import doctorDetailReducer from '../screens/user/healthcare/doctor-detail/doctorDetailSlice';
import doctorSearchReducer from '../screens/user/healthcare/doctor-search/doctorSearchSlice';
import doctorReviewsReducer from '../screens/user/healthcare/doctor-reviews/doctorReviewsSlice';
import clinicSelectionReducer from '../screens/user/healthcare/clinic-selection/clinicSelectionSlice';
import slotSelectionReducer from '../screens/user/healthcare/slot-selection/slotSelectionSlice';
import healthcareBookingReducer from '../screens/user/healthcare/book-appointment/healthcareBookingSlice';
import bookingConfirmationReducer from '../screens/user/healthcare/booking-confirmation/bookingConfirmationSlice';
import myAppointmentsReducer from '../screens/user/healthcare/MyAppointments/myAppointmentsSlice';
import appointmentDetailReducer from '../screens/user/healthcare/AppointmentDetail/appointmentDetailSlice';
import rescheduleAppointmentReducer from '../screens/user/healthcare/RescheduleAppointment/rescheduleAppointmentSlice';
import videoWaitingRoomReducer from '../screens/user/healthcare/VideoWaitingRoom/videoWaitingRoomSlice';
import videoCallReducer from '../screens/user/healthcare/VideoCall/videoCallSlice';
import inCallChatReducer from '../screens/user/healthcare/InCallChat/inCallChatSlice';
import prescriptionViewReducer from '../screens/user/healthcare/prescription-view/prescriptionViewSlice';
import healthRecordsReducer from '../screens/user/healthcare/health-records/healthRecordsSlice';
import uploadRecordReducer from '../screens/user/healthcare/upload-record/uploadRecordSlice';

// Healthcare Doctor/Provider slices (screens/providers/healthcare/)
import doctorDashboardReducer from '../screens/providers/healthcare/doctor-home/doctorDashboardSlice';
import doctorScheduleReducer from '../screens/providers/healthcare/doctor-schedule/doctorScheduleSlice';
import patientQueueReducer from '../screens/providers/healthcare/patient-queue/patientQueueSlice';
import medicalNotesReducer from '../screens/providers/healthcare/medical-notes/medicalNotesSlice';
import prescriptionWriterReducer from '../screens/providers/healthcare/prescription-writer/prescriptionWriterSlice';
import patientHistoryReducer from '../screens/providers/healthcare/patient-history/patientHistorySlice';
import doctorEarningsReducer from '../screens/providers/healthcare/doctor-earnings/doctorEarningsSlice';
import doctorProfileReducer from '../screens/providers/healthcare/profile/doctorProfileSlice';
import availabilitySettingsReducer from '../screens/providers/healthcare/availability-settings/availabilitySettingsSlice';
import manageSlotsReducer from '../screens/providers/healthcare/manage-slots/manageSlotsSlice';

// Admin Healthcare
import healthcareAnalyticsReducer from '../screens/admin/healthcare/HealthcareAnalytics/healthcareAnalyticsSlice';
import specialtyManagementReducer from '../screens/admin/healthcare/SpecialtyManagement/specialtyManagementSlice';
import doctorManagementReducer from '../screens/admin/healthcare/DoctorManagement/doctorManagementSlice';
import appointmentConfirmReducer from '../screens/user/healthcare/appointment-confirm/appointmentConfirmSlice';

// Shopping Module reducers
import shoppingHomeReducer from '../screens/Shopping/User/ShoppingHome/shoppingHomeSlice';
import brandListReducer from '../screens/Shopping/User/BrandList/brandListSlice';
import brandStoreReducer from '../screens/Shopping/User/BrandStore/brandStoreSlice';
import productListReducer from '../screens/Shopping/User/ProductList/productListSlice';
import productSearchReducer from '../screens/Shopping/User/ProductSearch/productSearchSlice';
import productDetailReducer from '../screens/Shopping/User/ProductDetail/productDetailSlice';
import productReviewsReducer from '../screens/Shopping/User/ProductReviews/productReviewsSlice';
import cartReducer from '../screens/Shopping/User/Cart/cartSlice';
import checkoutAddressReducer from '../screens/Shopping/User/CheckoutAddress/checkoutAddressSlice';
import checkoutDeliveryReducer from '../screens/Shopping/User/CheckoutDelivery/checkoutDeliverySlice';
import checkoutPaymentReducer from '../screens/Shopping/User/CheckoutPayment/checkoutPaymentSlice';
import checkoutReviewReducer from '../screens/Shopping/User/CheckoutReview/checkoutReviewSlice';
import wishlistReducer from '../screens/Shopping/User/Wishlist/wishlistSlice';
import orderConfirmationReducer from '../screens/Shopping/User/OrderConfirmation/orderConfirmationSlice';
import myOrdersReducer from '../screens/Shopping/User/MyOrders/myOrdersSlice';
import orderTrackingReducer from '../screens/Shopping/User/OrderTracking/orderTrackingSlice';
import returnRequestReducer from '../screens/Shopping/User/ReturnRequest/returnRequestSlice';
import writeReviewReducer from '../screens/Shopping/User/WriteReview/writeReviewSlice';
import brandHomeReducer from '../screens/Shopping/Brand/BrandHome/brandHomeSlice';
import brandProductsReducer from '../screens/Shopping/Brand/BrandProducts/brandProductsSlice';
import productFormReducer from '../screens/Shopping/Brand/ProductForm/productFormSlice';
import inventoryReducer from '../screens/Shopping/Brand/Inventory/inventorySlice';
import brandOrdersReducer from '../screens/Shopping/Brand/BrandOrders/brandOrdersSlice';
import processOrderReducer from '../screens/Shopping/Brand/ProcessOrder/processOrderSlice';
import returnRequestsReducer from '../screens/Shopping/Brand/ReturnRequests/returnRequestsSlice';
import brandAnalyticsReducer from '../screens/Shopping/Brand/BrandAnalytics/brandAnalyticsSlice';
import brandDeliveriesReducer from '../screens/Shopping/Brand/BrandDeliveries/brandDeliveriesSlice';
import addBrandReducer from '../screens/admin/Shopping/AddBrand/addBrandSlice';
import brandManagementReducer from '../screens/admin/Shopping/BrandManagement/brandManagementSlice';
import editBrandReducer from '../screens/admin/Shopping/EditBrand/editBrandSlice';
import outletManagementReducer from '../screens/admin/Shopping/OutletManagement/outletManagementSlice';
import addOutletReducer from '../screens/admin/Shopping/AddOutlet/addOutletSlice';
import outletDetailReducer from '../screens/admin/Shopping/OutletDetail/outletDetailSlice';
import orderDetailReducer from '../screens/Shopping/User/OrderDetail/orderDetailSlice';
import couponListReducer from '../screens/Shopping/User/CouponList/couponListSlice';
import brandProfileReducer from '../screens/Shopping/Brand/BrandProfile/brandProfileSlice';
import brandCouponsReducer from '../screens/Shopping/Brand/BrandCoupons/brandCouponsSlice';
import brandReviewsReducer from '../screens/Shopping/Brand/BrandReviews/brandReviewsSlice';
import adminShoppingDashboardReducer from '../screens/admin/Shopping/AdminShoppingDashboard/adminShoppingDashboardSlice';
import adminShoppingOrdersReducer from '../screens/admin/Shopping/AdminShoppingOrders/adminShoppingOrdersSlice';
import adminShoppingOrderDetailReducer from '../screens/admin/Shopping/AdminShoppingOrderDetail/adminShoppingOrderDetailSlice';
import adminShoppingAnalyticsReducer from '../screens/admin/Shopping/AdminShoppingAnalytics/adminShoppingAnalyticsSlice';
import adminShoppingSettingsReducer from '../screens/admin/Shopping/AdminShoppingSettings/adminShoppingSettingsSlice';
import unreadReducer from './unreadSlice';

// ── Redux Persist Config ────────────────────
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['cart', 'wishlist'],
};

// ============================================================================
// Account-scoped state must not survive an account change.
//
// The store outlives a logout — it only dies with the JS bundle — so every
// slice kept the previous account's data while the next account signed in.
// That is why a provider could see another provider's name on Home, a stale
// balance, or someone else's jobs: whichever screen had not refetched yet was
// still rendering the last user's session.
//
// Resetting at the ROOT rather than slice by slice is deliberate. There are
// well over a hundred slices here; any hand-maintained list of "the ones that
// matter" would miss one, and the bug would quietly come back.
// ============================================================================
export const RESET_ALL_STATE = 'auth/resetAll' as const;

// Slices describing the APP PROCESS rather than an account.
//
// These survive EVERY reset, logout included. `appContainer` holds the boot
// flags the whole app is gated on — `isAppReady`, `status`, and the onboarding
// flag — and its initial state is `isAppReady: false`. Wiping it parks the app
// on its black boot spinner forever, because the effect that sets the flag
// runs once at mount and never again. Clearing an account must never be able
// to un-boot the app.
//
// Identity inside this slice (currentUser / currentProvider / userType) is
// still cleared on logout — by appContainer's own `logout` reducer, which
// performLogout dispatches. That is the right split: the slice decides which
// of its own fields are account-scoped, instead of an outside allowlist
// guessing all-or-nothing.
const SHELL_SLICES = ['appContainer'] as const;

// Slices carrying an IN-FLIGHT SIGN-IN. Preserved on login only: the sign-in
// screens hold their email/password fields in Redux, so clearing these
// mid-login would blank the form being submitted — and lose the user's typed
// credentials if the attempt then failed.
const SIGN_IN_SLICES = ['signIn', 'providerSignIn', 'role', 'provider'] as const;

/**
 * Wipe account-scoped state back to initial.
 *
 * `preserveSession` marks the LOGIN path, where the goal is to clear the
 * PREVIOUS account without disturbing the sign-in in progress. Logout calls
 * this with no argument. Either way the shell slices above are kept.
 */
export const resetAllState = (preserveSession = false) => ({
  type: RESET_ALL_STATE,
  payload: { preserveSession },
});

const appReducer = combineReducers({
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
  favorites: favoritesReducer,
  serviceProviders: serviceProvidersReducer,
  home: homeReducer,
  providerProfile: providerProfileReducer,
  booking: bookingReducer,
  bookConfirmation: bookConfirmationReducer,
  liveTracking: liveTrackingReducer,
  serviceStatus: serviceStatusReducer,
  payment: paymentReducer,
  reviewRating: reviewRatingReducer,
  quickSearchForm: quickSearchReducer,
  searchingProviders: searchProvidersReducer,
  dashboard: providerDashboardReducer,
  jobs: providerJobsReducer,
  earnings: providerEarningsReducer,
  profile: providerHomeProfileReducer,
  jobDetail: jobDetailReducer,
  navigationMap: navigationMapReducer,
  jobInProgress: jobInProgressReducer,
  awaitingApproval: awaitingApprovalReducer,
  paymentRequest: paymentRequestReducer,
  jobCompletion: jobCompletionReducer,
  adminSPDashboard: adminServiceProvidersDashboardReducer,
  adminSPBookings: adminServiceProvidersBookingsReducer,
  adminSPAnalytics: adminServiceProvidersAnalyticsReducer,
  healthcareHome: healthcareHomeReducer,
  specialtyList: specialtyListReducer,
  doctorList: doctorListReducer,
  doctorDetail: doctorDetailReducer,
  doctorSearch: doctorSearchReducer,
  doctorReviews: doctorReviewsReducer,
  clinicSelection: clinicSelectionReducer,
  slotSelection: slotSelectionReducer,
  healthcareBooking: healthcareBookingReducer,
  bookingConfirmation: bookingConfirmationReducer,
  appointmentConfirm: appointmentConfirmReducer,
  myAppointments: myAppointmentsReducer,
  appointmentDetail: appointmentDetailReducer,
  rescheduleAppointment: rescheduleAppointmentReducer,
  videoWaitingRoom: videoWaitingRoomReducer,
  videoCall: videoCallReducer,
  inCallChat: inCallChatReducer,
  prescriptionView: prescriptionViewReducer,
  healthRecords: healthRecordsReducer,
  uploadRecord: uploadRecordReducer,
  doctorDashboard: doctorDashboardReducer,
  doctorSchedule: doctorScheduleReducer,
  patientQueue: patientQueueReducer,
  medicalNotes: medicalNotesReducer,
  prescriptionWriter: prescriptionWriterReducer,
  patientHistory: patientHistoryReducer,
  doctorEarnings: doctorEarningsReducer,
  doctorProfile: doctorProfileReducer,
  availabilitySettings: availabilitySettingsReducer,
  manageSlots: manageSlotsReducer,
  healthcareAnalytics: healthcareAnalyticsReducer,
  specialtyManagement: specialtyManagementReducer,
  doctorManagement: doctorManagementReducer,
  userProfile: userProfileReducer,
  wallet: walletSlice.reducer,
  shoppingHome: shoppingHomeReducer,
  brandList: brandListReducer,
  brandStore: brandStoreReducer,
  productList: productListReducer,
  productSearch: productSearchReducer,
  productDetail: productDetailReducer,
  productReviews: productReviewsReducer,
  cart: cartReducer,
  wishlist: wishlistReducer,
  checkoutAddress: checkoutAddressReducer,
  checkoutDelivery: checkoutDeliveryReducer,
  checkoutPayment: checkoutPaymentReducer,
  checkoutReview: checkoutReviewReducer,
  orderConfirmation: orderConfirmationReducer,
  myOrders: myOrdersReducer,
  orderTracking: orderTrackingReducer,
  returnRequest: returnRequestReducer,
  writeReview: writeReviewReducer,
  brandHome: brandHomeReducer,
  brandProducts: brandProductsReducer,
  productForm: productFormReducer,
  inventory: inventoryReducer,
  brandOrders: brandOrdersReducer,
  processOrder: processOrderReducer,
  returnRequests: returnRequestsReducer,
  brandAnalytics: brandAnalyticsReducer,
  brandDeliveries: brandDeliveriesReducer,
  addBrand: addBrandReducer,
  brandManagement: brandManagementReducer,
  editBrand: editBrandReducer,
  outletManagement: outletManagementReducer,
  addOutlet: addOutletReducer,
  outletDetail: outletDetailReducer,
  orderDetail: orderDetailReducer,
  couponList: couponListReducer,
  brandProfile: brandProfileReducer,
  brandCoupons: brandCouponsReducer,
  brandReviews: brandReviewsReducer,
  adminShoppingDashboard: adminShoppingDashboardReducer,
  adminShoppingOrders: adminShoppingOrdersReducer,
  adminShoppingOrderDetail: adminShoppingOrderDetailReducer,
  adminShoppingAnalytics: adminShoppingAnalyticsReducer,
  adminShoppingSettings: adminShoppingSettingsReducer,
  // App-wide unread message counts, so a badge can exist outside the chat screen.
  unread: unreadReducer,
});

// Handing `undefined` state to combineReducers makes every slice rebuild from
// its own initial state. The action itself is still forwarded so any slice
// that wants to react to it explicitly can.
const rootReducer = (
  state: ReturnType<typeof appReducer> | undefined,
  action: { type: string; payload?: { preserveSession?: boolean } }
) => {
  if (action.type !== RESET_ALL_STATE) {
    return appReducer(state, action as never);
  }

  if (!state) return appReducer(undefined, action as never);

  // Carry the surviving slices across the wipe by seeding the rebuilt tree with
  // them; every other slice rebuilds from its own initial state.
  const survivors: string[] = [
    ...SHELL_SLICES,
    ...(action.payload?.preserveSession ? SIGN_IN_SLICES : []),
  ];

  const kept: Partial<ReturnType<typeof appReducer>> = {};
  for (const key of survivors) {
    if (key in state) {
      (kept as Record<string, unknown>)[key] = (state as Record<string, unknown>)[key];
    }
  }
  return appReducer(
    kept as ReturnType<typeof appReducer>,
    action as never
  );
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof appReducer>;
export type AppDispatch = typeof store.dispatch;