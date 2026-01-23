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

import ProviderWaitingScreen from "../screens/provider-waiting/providerWaitingScreen";
import ProviderApprovalPendingScreen from "../screens/authentication-screens/provider-approval-pending/providerApprovalPendingScreen";

// Home Screens
import UserHomeScreen from "../screens/user-home/userHome";
import ProviderHomeScreen from "../screens/provider-home/ProviderHome";

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
  
  // Provider Approval
  ProviderApprovalPending: "ProviderApprovalPending",
  
  // Home Screens
  UserHome: "UserHome",
  ProviderHome: "ProviderHome",
  
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
  
  // Other screens (to be added)
  Logout: "Logout",
  ForgotPasswordScreen: "ForgotPassword",
  EmailVerificationScreen: "EmailVerification",
  VerifySuccess: "VerifySuccess",
  ResetPasswordOTPScreen: "ResetPasswordOTP",
  ResetPasswordScreen: "ResetPassword",

  ProviderWaitingScreen: "ProviderWaiting",
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
  ProviderHome: undefined;
  
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

  // Other
  Logout: undefined;
  ForgotPassword: { userType?: 'user' | 'provider' };
  EmailVerification: { email: string; verificationType: 'email_verification'; userType?: 'user' | 'provider' };
  ResetPasswordOTP: { email: string; userType?: 'user' | 'provider' };
  ResetPassword: { email: string; resetToken: string; userType?: 'user' | 'provider' };
  ProviderWaiting: { providerId: string };
  ProviderApprovalPending: { providerId?: string };
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
    component: ProviderHomeScreen,
    title: BaseRouteNames.ProviderHome,
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
  }
];

