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

import ProviderChatListScreen from "../screens/providers/homeservice/chat/providerChatListScreen";
import ProviderChatRoomScreen from "../screens/providers/homeservice/chat/providerChatRoomScreen";

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
import QuickSearchScreen from "../screens/user/homeservice/quick-search/QuickSearchScreen";
import SearchProvidersScreen from "../screens/user/homeservice/search-providers/searchProviders";
import ProviderChatScreen from "../screens/user/homeservice/providers-chat/providersChatScreen";
import CallScreen from "../screens/user/homeservice/call-screen/callScreen";
import UserWalletScreen from "../screens/user/homeservice/wallet/walletScreen";
import ProviderWalletScreen from "../screens/providers/homeservice/wallet/providerWalletScreen";

// Provider Job Flow Screens
import JobDetailScreen from "../screens/providers/homeservice/jobdetail-screen/jobDetail";
import NavigationMapScreen from "../screens/providers/homeservice/map-screen/map";
import JobInProgressScreen from "../screens/providers/homeservice/job-InProgress/jobInProgress";
import AwaitingApprovalScreen from "../screens/providers/homeservice/awaiting-screen/awaitingScreen";
import ProviderPaymentRequestScreen from "../screens/providers/homeservice/payment-screen/paymentScreen";
import JobCompletionScreen from "../screens/providers/homeservice/job-completion/jobCompletion";

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

  ProviderChatRoom: "ProviderChatRoom",
  ProviderChatList: "ProviderChatList",
  
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
  QuickSearchScreen: "QuickSearchScreen",
  SearchingProvidersScreen: "SearchingProvidersScreen",
  ProviderChatScreen: "ProviderChatScreen",
  CallScreen: "CallScreen",
  UserWalletScreen: "UserWalletScreen",
  ProviderWalletScreen: "ProviderWalletScreen",
  
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
  
  ProviderChatRoom: { room: any; otherParty: any };
  ProviderChatList: undefined;
  
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
  BookConfirmation: { category?: 'electricians' | 'plumbers' | 'ac-repairers' };
  liveTracking: { bookingId?: string; category?: 'electricians' | 'plumbers' | 'ac-repairers' };
  serviceStatus: { bookingId?: string; category?: 'electricians' | 'plumbers' | 'ac-repairers' };
  PaymentScreen: { bookingId?: string; category?: 'electricians' | 'plumbers' | 'ac-repairers'; paymentData?: any };
  ReviewRating: { bookingId?: string; category?: 'electricians' | 'plumbers' | 'ac-repairers'; serviceData?: any };
  QuickSearchScreen: { serviceType?: 'electricians' | 'plumbers' | 'ac-repairers' };
  SearchingProvidersScreen: { serviceType?: 'electricians' | 'plumbers' | 'ac-repairers'; jobDescription?: string; location?: string };
  ProviderChatScreen: { provider?: any; serviceType?: 'electricians' | 'plumbers' | 'ac-repairers'; jobDescription?: string; location?: string };
  CallScreen: { provider?: any; serviceType?: 'electricians' | 'plumbers' | 'ac-repairers' };
  UserWalletScreen: undefined;
  ProviderWalletScreen: undefined;
  
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
  
  
  {
  component: ProviderChatListScreen,
  title: BaseRouteNames.ProviderChatList,
  options: { headerShown: false, animation: 'slide_from_right' }
},
{
  component: ProviderChatRoomScreen,
  title: BaseRouteNames.ProviderChatRoom,
  options: { headerShown: false, animation: 'slide_from_right' }
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
  // Quick Search Flow Routes
  {
    component: QuickSearchScreen,
    title: BaseRouteNames.QuickSearchScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: SearchProvidersScreen,
    title: BaseRouteNames.SearchingProvidersScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: ProviderChatScreen,
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
  // Wallet Screens
  {
    component: UserWalletScreen,
    title: BaseRouteNames.UserWalletScreen,
    options: {
      headerShown: false,
      animation: 'slide_from_right',
    }
  },
  {
    component: ProviderWalletScreen,
    title: BaseRouteNames.ProviderWalletScreen,
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
  }
];

