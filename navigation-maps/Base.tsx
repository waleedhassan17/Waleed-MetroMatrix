import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

// Import screens
import SplashScreen from "../screens/authentication-screens/on-boarding/splash";
import Onboarding from "../screens/authentication-screens/on-boarding/onboarding";
import RoleSelection from "../screens/role-selection/role";
import ProviderSelectionScreen from "../screens/provider-selection/provider";

// User Authentication Screens
import SignIn from "../screens/user-authentication/signin-screen/signin";
import SignUp from "../screens/user-authentication/signup-screen/signup";
import CompleteProfile from "../screens/authentication-screens/profile-info/completeProfile";

// Provider Authentication Screens
import ProviderSignIn from "../screens/provider-authentication/signin-screen/signin";
import ProviderSignUp from "../screens/provider-authentication/signup-screen/signup";
import PersonalInfoScreen from "../screens/authentication-screens/provider-info/personalInfo";

import ForgotPasswordScreen from "../screens/authentication-screens/forget-password/forgetPassword";
import EmailVerificationScreen from "../screens/authentication-screens/email-verification/emailVerification";
import VerifySuccessScreen from "../screens/verify-success/verifySuccess";
import ResetPasswordOTPScreen from "../screens/authentication-screens/reset-password-otp/resetPasswordOtp";
import ResetPasswordScreen from "../screens/authentication-screens/reset-password/resetPassword";

import AdminDashboardScreen from "../screens/admin/admin-dashboard/adminDashboard";
import ProviderManagementScreen from "../screens/admin/provider-management/providerManagementScreen";
import ProviderReviewScreen from "../screens/admin/pending-review/pendingReviewScreen";
import UserManagementScreen from "../screens/admin/user-management/userManagementScreen";
import ServiceProvidersAdminScreen from "../screens/admin/providers/service-providers/tabs/index";

import ProviderWaitingScreen from "../screens/provider-waiting/providerWaitingScreen";
import ProviderApprovalPendingScreen from "../screens/authentication-screens/provider-approval-pending/providerApprovalPendingScreen";

// Home Screens
import UserHomeScreen from "../screens/user-home/userHome";
import HomeServiceProviderLayout from "../screens/providers/homeservice/tabs/index";

// User Service Screens
import HomeServiceLayout from "../screens/user/homeservice/tabs/layout";
import ProvidersScreen from "../screens/user/homeservice/service-providers/ProvidersScreen";
import ProviderProfileScreen from "../screens/user/homeservice/provider-profile/providerProfile";
import BookingScreen from "../screens/user/homeservice/Booking/bookingScreen";
import BookConfirmationScreen from "../screens/user/homeservice/book-confirmation/bookConfirmation";
import LiveTrackingScreen from "../screens/user/homeservice/live-tracking/liveTracking";
import ServiceStatusScreen from "../screens/user/homeservice/service-status/serviceStatus";
import PaymentScreen from "../screens/user/homeservice/payment-screen/payment";
import ReviewRatingScreen from "../screens/user/homeservice/rating-screen/rating";
// Chat and calling are ONE centralized feature (like the wallet): a single
// Chat screen and a single Call screen serve home services and healthcare,
// customer side and provider side. Every legacy route name below is registered
// against these two components; screens/shared/communication/roomParams.ts
// normalizes the differing param names those call sites pass.
import type { RoomParams } from "../screens/shared/communication/roomParams";
import ChatScreen from "../screens/shared/communication/ChatScreen";
import CallScreen from "../screens/shared/communication/CallScreen";
import ConversationsScreen from "../screens/shared/communication/ConversationsScreen";
import ProviderNotificationsScreen from "../screens/providers/homeservice/notifications/ProviderNotificationsScreen";

// Centralized User Screens
import UserProfileScreen from "../screens/user/shared/profile/UserProfileScreen";
import WalletScreen from "../screens/user/wallet/WalletScreen";
import TransactionHistoryScreen from "../screens/user/wallet/TransactionHistoryScreen";
import TopUpWebViewScreen from "../screens/user/wallet/TopUpWebViewScreen";

// Provider Job Flow Screens
import JobDetailScreen from "../screens/providers/homeservice/jobdetail-screen/jobDetail";
import NavigationMapScreen from "../screens/providers/homeservice/map-screen/map";
import JobInProgressScreen from "../screens/providers/homeservice/job-InProgress/jobInProgress";
import AwaitingApprovalScreen from "../screens/providers/homeservice/awaiting-screen/awaitingScreen";
import ProviderPaymentRequestScreen from "../screens/providers/homeservice/payment-screen/paymentScreen";
import JobCompletionScreen from "../screens/providers/homeservice/job-completion/jobCompletion";
// Healthcare chat + voice call. These live in the ROOT stack (not the nested
// Healthcare/Doctor stacks) because both the patient and the doctor navigate to
// them, and a push-notification tap must be able to reach them from anywhere.
import ProviderAvailabilityScreen from "../screens/providers/homeservice/availability/availabilityScreen";

// Shopping Module
import ShoppingStack from "../navigators/ShoppingStack";
import BrandStack from "../navigators/BrandStack";

// Healthcare Module
import HealthcareStack from "../navigators/HealthcareStack";
import DoctorStack from "../navigators/DoctorStack";

// Admin Shopping
import AdminShoppingStack from "../navigators/AdminShoppingStack";

// Admin Healthcare
import HealthcareAnalyticsScreen from "../screens/admin/healthcare/HealthcareAnalytics/HealthcareAnalyticsScreen";
import SpecialtyManagementScreen from "../screens/admin/healthcare/SpecialtyManagement/SpecialtyManagementScreen";
import DoctorManagementScreen from "../screens/admin/healthcare/DoctorManagement/DoctorManagementScreen";
import AdminHealthcareDashboardScreen from "../screens/admin/healthcare/AdminHealthcareDashboard/AdminHealthcareDashboardScreen";
import AdminAppointmentsScreen from "../screens/admin/healthcare/AdminAppointments/AdminAppointmentsScreen";
import AdminAppointmentDetailScreen from "../screens/admin/healthcare/AdminAppointmentDetail/AdminAppointmentDetailScreen";
import AdminClinicManagementScreen from "../screens/admin/healthcare/AdminClinicManagement/AdminClinicManagementScreen";
import AdminReviewModerationScreen from "../screens/admin/healthcare/AdminReviewModeration/AdminReviewModerationScreen";
import AdminHealthcareSettingsScreen from "../screens/admin/healthcare/AdminHealthcareSettings/AdminHealthcareSettingsScreen";

// HS8: remaining Home Services customer + admin screens
import AddressManagementScreen from "../screens/user/homeservice/address-management/AddressManagementScreen";
import BookingDetailScreen from "../screens/user/homeservice/booking-detail/BookingDetailScreen";
import FavoritesScreen from "../screens/user/homeservice/favorites/FavoritesScreen";
import WebRTCDiagnosticScreen from "../screens/shared/communication/WebRTCDiagnosticScreen";
import ProviderEditProfileScreen from "../screens/providers/homeservice/edit-profile/EditProfileScreen";
import ProviderSettingsScreen from "../screens/providers/homeservice/settings/ProviderSettingsScreen";
import RaiseDisputeScreen from "../screens/user/homeservice/raise-dispute/RaiseDisputeScreen";
import HomeServiceNotificationsScreen from "../screens/user/homeservice/notifications/HomeServiceNotificationsScreen";
import AdminHSBookingsScreen from "../screens/admin/homeservice/AdminBookings/AdminBookingsScreen";
import AdminHSBookingDetailScreen from "../screens/admin/homeservice/AdminBookingDetail/AdminBookingDetailScreen";
import AdminHSDisputesScreen from "../screens/admin/homeservice/AdminDisputes/AdminDisputesScreen";
import AdminHSPayoutsScreen from "../screens/admin/homeservice/AdminPayouts/AdminPayoutsScreen";
import AdminHSServiceCategoriesScreen from "../screens/admin/homeservice/AdminServiceCategories/AdminServiceCategoriesScreen";
import AdminHSAnalyticsScreen from "../screens/admin/homeservice/AdminHomeServiceAnalytics/AdminHomeServiceAnalyticsScreen";
import AdminHSSettingsScreen from "../screens/admin/homeservice/AdminHomeServiceSettings/AdminHomeServiceSettingsScreen";

// Route names enum for type safety
export const BaseRouteNames = {
  // Onboarding
  Splash: "Splash",
  Onboarding: "Onboarding",
  RoleSelection: "RoleSelection",
  ProviderSelection: "ProviderSelection",
  
  // User Authentication
  SignIn: "SignIn",
  SignUp: "SignUp",
  CompleteProfile: "CompleteProfile",
  
  // Provider Authentication
  ProviderSignIn: "ProviderSignIn",
  ProviderSignUp: "ProviderSignUp",
  PersonalInfo: "PersonalInfo",

  //Admin
  AdminDashboardScreen: "AdminDashboard",
  ProviderManagementScreen: "ProviderManagement",
  ProviderReviewScreen: "ProviderReview",
  PendingReview: "PendingReview",
  UserManagementScreen: "UserManagement",
  ServiceProviders: "ServiceProviders",
  
  // Provider Approval
  ProviderApprovalPending: "ProviderApprovalPending",
  
  // Home Screens
  UserHome: "UserHome",
  HomeServiceProviderDashboard: "HomeServiceProviderDashboard",
  
  // User Service Screens
  HomeServiceLayout: "HomeServiceLayout",
  ProvidersScreen: "ProvidersScreen",
  ProviderProfileScreen: "ProviderProfile",
  BookingScreen: "BookingScreen",
  BookConfirmationScreen: "BookConfirmation",
  LiveTrackingScreen: "liveTracking",
  ServiceStatusScreen: "serviceStatus",
  PaymentScreen: "PaymentScreen",
  ReviewRatingScreen: "ReviewRating",
  // Centralized chat + call. Every alias below renders the SAME two screens.
  Chat: "Chat",
  Call: "Call",
  ProviderChatScreen: "ProviderChatScreen",
  CallScreen: "CallScreen",
  // The inbox. One screen; two names so each vertical can theme it and reach
  // it from its own navigator.
  Conversations: "Conversations",
  ProviderConversations: "ProviderConversations",
  ProviderNotifications: "ProviderNotifications",
  UserProfileScreen: "UserProfileScreen",
  WalletScreen: "WalletScreen",
  TransactionHistoryScreen: "TransactionHistoryScreen",
  TopUpWebView: "TopUpWebView",
  WalletTopUpSuccess: "WalletTopUpSuccess",
  WalletTopUpCancel: "WalletTopUpCancel",
  
  // Other screens (to be added)
  Logout: "Logout",
  ForgotPasswordScreen: "ForgotPassword",
  EmailVerificationScreen: "EmailVerification",
  VerifySuccess: "VerifySuccess",
  ResetPasswordOTPScreen: "ResetPasswordOTP",
  ResetPasswordScreen: "ResetPassword",

  ProviderWaitingScreen: "ProviderWaiting",
  
  // Provider Job Flow Screens
  JobDetail: "JobDetail",
  NavigationMap: "NavigationMap",
  JobInProgress: "JobInProgress",
  AwaitingApproval: "AwaitingApproval",
  PaymentRequest: "PaymentRequest",
  JobCompletion: "JobCompletion",
  // HS7: provider side of the two-party features + availability settings
  ProviderJobChat: "ProviderJobChat",
  ProviderCallScreen: "ProviderCallScreen",

  // Healthcare consultation chat + voice call (room = the appointment)
  HealthcareConsultChat: "HealthcareConsultChat",
  DoctorConsultChat: "DoctorConsultChat",
  HealthcareConsultCall: "HealthcareConsultCall",
  ProviderAvailability: "ProviderAvailability",

  // HS8: remaining customer + admin Home Services screens
  AddressManagement: "AddressManagement",
  Favorites: "Favorites",
  WebRTCDiagnostic: "WebRTCDiagnostic",
  ProviderEditProfile: "ProviderEditProfile",
  ProviderSettings: "ProviderSettings",
  BookingDetail: "BookingDetail",
  RaiseDispute: "RaiseDispute",
  HomeServiceNotifications: "HomeServiceNotifications",
  AdminHSBookings: "AdminHSBookings",
  AdminHSBookingDetail: "AdminHSBookingDetail",
  AdminHSDisputes: "AdminHSDisputes",
  AdminHSPayouts: "AdminHSPayouts",
  AdminHSServiceCategories: "AdminHSServiceCategories",
  AdminHSAnalytics: "AdminHSAnalytics",
  AdminHSSettings: "AdminHSSettings",

  // Shopping
  Shopping: "Shopping",
  BrandModule: "BrandModule",

  // Admin Shopping
  AdminShopping: "AdminShopping",

  // Admin Healthcare
  HealthcareAnalytics: "HealthcareAnalytics",
  SpecialtyManagement: "SpecialtyManagement",
  DoctorManagement: "DoctorManagement",
  AdminHealthcareDashboard: "AdminHealthcareDashboard",
  AdminAppointments: "AdminAppointments",
  AdminAppointmentDetail: "AdminAppointmentDetail",
  AdminClinicManagement: "AdminClinicManagement",
  AdminReviewModeration: "AdminReviewModeration",
  AdminHealthcareSettings: "AdminHealthcareSettings",

  // Healthcare Module
  HealthcareStack: "HealthcareStack",
  DoctorStack: "DoctorStack",
} as const;

export type BaseRouteName = typeof BaseRouteNames[keyof typeof BaseRouteNames];

// Route parameters
export type RootStackParamList = {
  // Onboarding
  Splash: undefined;
  Onboarding: undefined;
  RoleSelection: undefined;
  ProviderSelection: undefined;
  
  // User Authentication
  SignIn: undefined;
  SignUp: undefined;
  CompleteProfile: { userId: string };
  
  // Provider Authentication
  ProviderSignIn: undefined;
  ProviderSignUp: undefined;
  PersonalInfo: { providerId?: string };
  
  // Home Screens
  UserHome: undefined;
  HomeServiceProviderDashboard: undefined;
  
  // User Service Screens
  HomeServiceLayout: undefined;
  ProvidersScreen: { serviceType?: 'electricians' | 'plumbers' | 'ac-repairers'; selectedServices?: string[] };
  ProviderProfile: { id: string; category?: 'electricians' | 'plumbers' | 'ac-repairers' };
  BookingScreen: { providerId: string; category?: 'electricians' | 'plumbers' | 'ac-repairers' };
  // bookingId is the real id returned by POST /bookings. It is optional only
  // so legacy call sites still typecheck; every live path passes it.
  BookConfirmation: {
    category?: 'electricians' | 'plumbers' | 'ac-repairers';
    bookingId?: string;
  };
  liveTracking: { bookingId?: string; category?: 'electricians' | 'plumbers' | 'ac-repairers' };
  serviceStatus: { bookingId?: string; category?: 'electricians' | 'plumbers' | 'ac-repairers' };
  PaymentScreen: { bookingId?: string; category?: 'electricians' | 'plumbers' | 'ac-repairers'; paymentData?: any };
  ReviewRating: { bookingId?: string; category?: 'electricians' | 'plumbers' | 'ac-repairers'; serviceData?: any };
  // bookingId is what makes chat/calling real — it identifies the room the
  // realtime service authorizes against. Without one there is no conversation
  // to join, only a pre-booking browse.
  // Centralized chat/call params. `roomId` is canonical; bookingId /
  // appointmentId are accepted aliases so existing call sites keep working.
  // See screens/shared/communication/roomParams.ts.
  Chat: RoomParams;
  Call: RoomParams;
  ProviderChatScreen: RoomParams;
  CallScreen: RoomParams;
  // Only `roomType` and the accent are read — the list resolves its own rooms.
  Conversations: RoomParams | undefined;
  ProviderConversations: RoomParams | undefined;
  ProviderNotifications: undefined;
  UserWalletScreen: undefined;
  TransactionHistoryScreen: undefined;
  ProviderWalletScreen: undefined;
  UserProfileScreen: undefined;
  
  // Verification
  VerifySuccess: {
    accessToken?: string;
    refreshToken?: string;
    userType?: 'user' | 'provider';
  };
  
  //Admin
  AdminDashboard: undefined;
  ProviderManagement: undefined;
  ProviderReview: { providerId: string };
  PendingReview: undefined;
  UserManagement: undefined;
  ServiceProviders: undefined;

  // Other
  Logout: undefined;
  ForgotPassword: { userType?: 'user' | 'provider' };
  EmailVerification: { email: string; verificationType: 'email_verification'; userType?: 'user' | 'provider' };
  ResetPasswordOTP: { email: string; userType?: 'user' | 'provider' };
  ResetPassword: { email: string; resetToken: string; userType?: 'user' | 'provider' };
  ProviderWaiting: { providerId: string };
  ProviderApprovalPending: { providerId?: string };
  
  // Provider Job Flow
  JobDetail: { job?: any };
  NavigationMap: undefined;
  JobInProgress: undefined;
  AwaitingApproval: undefined;
  PaymentRequest: undefined;
  JobCompletion: undefined;
  ProviderJobChat: RoomParams;
  ProviderCallScreen: RoomParams;

  // Healthcare: the room id is the APPOINTMENT id (roomType 'healthcare').
  HealthcareConsultChat: RoomParams;
  DoctorConsultChat: RoomParams;
  HealthcareConsultCall: {
    appointmentId: string;
    counterpartName?: string;
    counterpartImage?: string;
  };
  ProviderAvailability: undefined;

  // HS8
  AddressManagement: undefined;
  Favorites: undefined;
  WebRTCDiagnostic: undefined;
  ProviderEditProfile: undefined;
  ProviderSettings: undefined;
  BookingDetail: { bookingId: string };
  RaiseDispute: { bookingId: string };
  HomeServiceNotifications: undefined;
  AdminHSBookings: undefined;
  AdminHSBookingDetail: { bookingId: string };
  AdminHSDisputes: undefined;
  AdminHSPayouts: undefined;
  AdminHSServiceCategories: undefined;
  AdminHSAnalytics: undefined;
  AdminHSSettings: undefined;

  // Shopping
  Shopping: undefined;
  BrandModule: undefined;

  // Admin Shopping
  AdminShopping: undefined;

  // Admin Healthcare
  HealthcareAnalytics: undefined;
  SpecialtyManagement: undefined;
  DoctorManagement: undefined;
  AdminHealthcareDashboard: undefined;
  AdminAppointments: undefined;
  AdminAppointmentDetail: { appointmentId: string };
  AdminClinicManagement: undefined;
  AdminReviewModeration: undefined;
  AdminHealthcareSettings: undefined;

  // Healthcare Module
  HealthcareStack: undefined;
  DoctorStack: undefined;
};

// Route interface
export interface IRoute {
  title: BaseRouteName;
  component: React.ComponentType<any>;
  options?: NativeStackNavigationOptions;
}

// Define all routes
export const BaseRoutes: IRoute[] = [
  // Onboarding Routes
  {
    component: SplashScreen,
    title: BaseRouteNames.Splash,
    options: {
      headerShown: false,
      animation: 'fade',
    },
  },
  {
    component: Onboarding,
    title: BaseRouteNames.Onboarding,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    },
  },
  {
    component: RoleSelection,
    title: BaseRouteNames.RoleSelection,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    },
  },
  {
    component: ProviderSelectionScreen,
    title: BaseRouteNames.ProviderSelection,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    },
  },
  
  // User Authentication Routes
  {
    component: SignIn,
    title: BaseRouteNames.SignIn,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    },
  },
  {
    component: SignUp,
    title: BaseRouteNames.SignUp,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    },
  },
  {
    component: CompleteProfile,
    title: BaseRouteNames.CompleteProfile,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    },
  },
  
  // Provider Authentication Routes
  {
    component: ProviderSignIn,
    title: BaseRouteNames.ProviderSignIn,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    },
  },
  {
    component: ProviderSignUp,
    title: BaseRouteNames.ProviderSignUp,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    },
  },
  {
    component: PersonalInfoScreen,
    title: BaseRouteNames.PersonalInfo,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    },
  },
  {
    component: ForgotPasswordScreen,
    title: BaseRouteNames.ForgotPasswordScreen,
    options: {
      headerShown: false,
    }
  },
  {
    component: EmailVerificationScreen,
    title: BaseRouteNames.EmailVerificationScreen,
    options: {
      headerShown: false,
    }
  },
  {
    component: VerifySuccessScreen,
    title: BaseRouteNames.VerifySuccess,
    options: {
      headerShown: false,
    }
  },
  {
    component: ResetPasswordOTPScreen,
    title: BaseRouteNames.ResetPasswordOTPScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: ResetPasswordScreen,
    title: BaseRouteNames.ResetPasswordScreen,
    options: {
      headerShown: false,
    }
  },
  {
    component: AdminDashboardScreen,
    title: BaseRouteNames.AdminDashboardScreen,
    options: {
      headerShown: false,
    }
  },
  {
    component: ProviderManagementScreen,
    title: BaseRouteNames.ProviderManagementScreen,
    options: {
      headerShown: false,
    }
  },
  {
    component: ProviderReviewScreen,
    title: BaseRouteNames.ProviderReviewScreen,
    options: {
      headerShown: false,
    }
  },
  {
    component: ProviderReviewScreen,
    title: BaseRouteNames.PendingReview,
    options: {
      headerShown: false,
    }
  },
  {
    component: UserManagementScreen,
    title: BaseRouteNames.UserManagementScreen,
    options: {
      headerShown: false,
    }
  },
  {
    component: ServiceProvidersAdminScreen,
    title: BaseRouteNames.ServiceProviders,
    options: {
      headerShown: false,
    }
  },
  {
    component: ProviderApprovalPendingScreen,
    title: BaseRouteNames.ProviderApprovalPending,
    options: {
      headerShown: false,
    }
  },
  {
    component: UserHomeScreen,
    title: BaseRouteNames.UserHome,
    options: {
      headerShown: false,
    }
  },
  {
    component: HomeServiceProviderLayout,
    title: BaseRouteNames.HomeServiceProviderDashboard,
    options: {
      headerShown: false,
    }
  },
  {
    component: HomeServiceLayout,
    title: BaseRouteNames.HomeServiceLayout,
    options: {
      headerShown: false,
    }
  },
  {
    component: ProvidersScreen,
    title: BaseRouteNames.ProvidersScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: ProviderProfileScreen,
    title: BaseRouteNames.ProviderProfileScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: BookingScreen,
    title: BaseRouteNames.BookingScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: BookConfirmationScreen,
    title: BaseRouteNames.BookConfirmationScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: LiveTrackingScreen,
    title: BaseRouteNames.LiveTrackingScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: ServiceStatusScreen,
    title: BaseRouteNames.ServiceStatusScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: PaymentScreen,
    title: BaseRouteNames.PaymentScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: ReviewRatingScreen,
    title: BaseRouteNames.ReviewRatingScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  // Canonical names for the centralized feature. New call sites should use
  // these two; the vertical-specific names below are kept so the existing
  // fifteen-odd navigate() calls keep working while they migrate.
  {
    component: ChatScreen,
    title: BaseRouteNames.Chat,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: CallScreen,
    title: BaseRouteNames.Call,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    }
  },
  {
    component: ConversationsScreen,
    title: BaseRouteNames.Conversations,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: ConversationsScreen,
    title: BaseRouteNames.ProviderConversations,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: ProviderNotificationsScreen,
    title: BaseRouteNames.ProviderNotifications,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: ChatScreen,
    title: BaseRouteNames.ProviderChatScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: CallScreen,
    title: BaseRouteNames.CallScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    }
  },
  {
    component: WalletScreen,
    title: BaseRouteNames.WalletScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: TransactionHistoryScreen,
    title: BaseRouteNames.TransactionHistoryScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: TopUpWebViewScreen,
    title: BaseRouteNames.TopUpWebView,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: WalletScreen,
    title: BaseRouteNames.WalletTopUpSuccess,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: WalletScreen,
    title: BaseRouteNames.WalletTopUpCancel,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  // Centralized User Screens
  {
    component: UserProfileScreen,
    title: BaseRouteNames.UserProfileScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  // Provider Job Flow Routes
  {
    component: JobDetailScreen,
    title: BaseRouteNames.JobDetail,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: NavigationMapScreen,
    title: BaseRouteNames.NavigationMap,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: JobInProgressScreen,
    title: BaseRouteNames.JobInProgress,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: AwaitingApprovalScreen,
    title: BaseRouteNames.AwaitingApproval,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: ProviderPaymentRequestScreen,
    title: BaseRouteNames.PaymentRequest,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: JobCompletionScreen,
    title: BaseRouteNames.JobCompletion,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  // HS7: provider chat / call / availability
  {
    component: ChatScreen,
    title: BaseRouteNames.ProviderJobChat,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: CallScreen,
    title: BaseRouteNames.ProviderCallScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    }
  },
  // Healthcare consultation chat + voice call. Root-stack so both the patient
  // and the doctor can reach them, including from a notification tap.
  {
    component: ChatScreen,
    title: BaseRouteNames.HealthcareConsultChat,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: ChatScreen,
    title: BaseRouteNames.DoctorConsultChat,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: CallScreen,
    title: BaseRouteNames.HealthcareConsultCall,
    options: {
      headerShown: false,
      animation: 'slide_from_bottom',
    }
  },
  {
    component: ProviderAvailabilityScreen,
    title: BaseRouteNames.ProviderAvailability,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },

  // HS8: remaining customer + admin Home Services screens
  {
    component: AddressManagementScreen,
    title: BaseRouteNames.AddressManagement,
    options: { headerShown: false, animation: 'slide_from_right' }
  },
  // Dev diagnostic: proves the native WebRTC module builds, links and renders
  // under the New Architecture on a given device. Reachable by name only.
  {
    component: WebRTCDiagnosticScreen,
    title: BaseRouteNames.WebRTCDiagnostic,
    options: { headerShown: false, animation: 'slide_from_right' }
  },
  // Saved providers — the destination for the profile heart and the Favorites
  // rows in both account menus.
  {
    component: FavoritesScreen,
    title: BaseRouteNames.Favorites,
    options: { headerShown: false, animation: 'slide_from_right' }
  },
  // Provider account screens the profile's Account list and gear link to.
  {
    component: ProviderEditProfileScreen,
    title: BaseRouteNames.ProviderEditProfile,
    options: { headerShown: false, animation: 'slide_from_right' }
  },
  {
    component: ProviderSettingsScreen,
    title: BaseRouteNames.ProviderSettings,
    options: { headerShown: false, animation: 'slide_from_right' }
  },
  {
    component: BookingDetailScreen,
    title: BaseRouteNames.BookingDetail,
    options: { headerShown: false, animation: 'slide_from_right' }
  },
  {
    component: RaiseDisputeScreen,
    title: BaseRouteNames.RaiseDispute,
    options: { headerShown: false, animation: 'slide_from_right' }
  },
  {
    component: HomeServiceNotificationsScreen,
    title: BaseRouteNames.HomeServiceNotifications,
    options: { headerShown: false, animation: 'slide_from_right' }
  },
  {
    component: AdminHSBookingsScreen,
    title: BaseRouteNames.AdminHSBookings,
    options: { headerShown: false, animation: 'slide_from_right' }
  },
  {
    component: AdminHSBookingDetailScreen,
    title: BaseRouteNames.AdminHSBookingDetail,
    options: { headerShown: false, animation: 'slide_from_right' }
  },
  {
    component: AdminHSDisputesScreen,
    title: BaseRouteNames.AdminHSDisputes,
    options: { headerShown: false, animation: 'slide_from_right' }
  },
  {
    component: AdminHSPayoutsScreen,
    title: BaseRouteNames.AdminHSPayouts,
    options: { headerShown: false, animation: 'slide_from_right' }
  },
  {
    component: AdminHSServiceCategoriesScreen,
    title: BaseRouteNames.AdminHSServiceCategories,
    options: { headerShown: false, animation: 'slide_from_right' }
  },
  {
    component: AdminHSAnalyticsScreen,
    title: BaseRouteNames.AdminHSAnalytics,
    options: { headerShown: false, animation: 'slide_from_right' }
  },
  {
    component: AdminHSSettingsScreen,
    title: BaseRouteNames.AdminHSSettings,
    options: { headerShown: false, animation: 'slide_from_right' }
  },

  // Shopping Route
  {
    component: ShoppingStack,
    title: BaseRouteNames.Shopping,
    options: {
      headerShown: false,
    }
  },

  // Brand Provider Route
  {
    component: BrandStack,
    title: BaseRouteNames.BrandModule,
    options: {
      headerShown: false,
    }
  },

  // Admin Shopping Route
  {
    component: AdminShoppingStack,
    title: BaseRouteNames.AdminShopping,
    options: {
      headerShown: false,
    }
  },

  // Admin Healthcare Routes
  {
    component: HealthcareAnalyticsScreen,
    title: BaseRouteNames.HealthcareAnalytics,
    options: {
      headerShown: false,
    }
  },
  {
    component: SpecialtyManagementScreen,
    title: BaseRouteNames.SpecialtyManagement,
    options: {
      headerShown: false,
    }
  },
  {
    component: DoctorManagementScreen,
    title: BaseRouteNames.DoctorManagement,
    options: {
      headerShown: false,
    }
  },
  {
    component: AdminHealthcareDashboardScreen,
    title: BaseRouteNames.AdminHealthcareDashboard,
    options: {
      headerShown: false,
    }
  },
  {
    component: AdminAppointmentsScreen,
    title: BaseRouteNames.AdminAppointments,
    options: {
      headerShown: false,
    }
  },
  {
    component: AdminAppointmentDetailScreen,
    title: BaseRouteNames.AdminAppointmentDetail,
    options: {
      headerShown: false,
    }
  },
  {
    component: AdminClinicManagementScreen,
    title: BaseRouteNames.AdminClinicManagement,
    options: {
      headerShown: false,
    }
  },
  {
    component: AdminReviewModerationScreen,
    title: BaseRouteNames.AdminReviewModeration,
    options: {
      headerShown: false,
    }
  },
  {
    component: AdminHealthcareSettingsScreen,
    title: BaseRouteNames.AdminHealthcareSettings,
    options: {
      headerShown: false,
    }
  },

  // Healthcare Module Routes
  {
    component: HealthcareStack,
    title: BaseRouteNames.HealthcareStack,
    options: {
      headerShown: false,
    }
  },
  {
    component: DoctorStack,
    title: BaseRouteNames.DoctorStack,
    options: {
      headerShown: false,
    }
  },
];


// ============================================================================
// Which vertical a route belongs to.
//
// The routes above are a flat list — home services has no stack of its own the
// way Healthcare and Shopping do — so there is no tree to hang a ThemeProvider
// on. This map is that tree, expressed as data: BaseNavigator wraps each screen
// in its module's theme, and a screen pushed from a tab (ProvidersScreen,
// BookingScreen, JobDetail …) therefore resolves the same green header as the
// tab it came from, instead of falling back to the neutral root.
//
// Only list a route once its screens actually read useTheme(). The
// admin-side home-service screens (AdminHS*) are deliberately absent: they live
// under screens/admin, have not been migrated, and would change appearance for
// no one's benefit.
// ============================================================================
export const RouteModules: Partial<Record<BaseRouteName, 'healthcare' | 'homeservice' | 'shopping'>> = {
  // Customer
  [BaseRouteNames.HomeServiceLayout]: 'homeservice',
  [BaseRouteNames.ProvidersScreen]: 'homeservice',
  [BaseRouteNames.ProviderProfileScreen]: 'homeservice',
  [BaseRouteNames.BookingScreen]: 'homeservice',
  [BaseRouteNames.BookConfirmationScreen]: 'homeservice',
  [BaseRouteNames.LiveTrackingScreen]: 'homeservice',
  [BaseRouteNames.ServiceStatusScreen]: 'homeservice',
  [BaseRouteNames.PaymentScreen]: 'homeservice',
  [BaseRouteNames.ReviewRatingScreen]: 'homeservice',
  [BaseRouteNames.AddressManagement]: 'homeservice',
  [BaseRouteNames.Favorites]: 'homeservice',
  [BaseRouteNames.BookingDetail]: 'homeservice',
  [BaseRouteNames.RaiseDispute]: 'homeservice',
  [BaseRouteNames.HomeServiceNotifications]: 'homeservice',

  // Provider
  [BaseRouteNames.HomeServiceProviderDashboard]: 'homeservice',
  [BaseRouteNames.ProviderNotifications]: 'homeservice',
  [BaseRouteNames.JobDetail]: 'homeservice',
  [BaseRouteNames.NavigationMap]: 'homeservice',
  [BaseRouteNames.JobInProgress]: 'homeservice',
  [BaseRouteNames.AwaitingApproval]: 'homeservice',
  [BaseRouteNames.PaymentRequest]: 'homeservice',
  [BaseRouteNames.JobCompletion]: 'homeservice',
  [BaseRouteNames.ProviderAvailability]: 'homeservice',
  [BaseRouteNames.ProviderEditProfile]: 'homeservice',
  [BaseRouteNames.ProviderSettings]: 'homeservice',
};
