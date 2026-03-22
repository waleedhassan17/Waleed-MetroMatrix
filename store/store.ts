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
import quickSearchReducer from "../screens/user/homeservice/quick-search/quicksearchSlice";
import searchProvidersReducer from "../screens/user/homeservice/search-providers/searchProvidersSlice";
import providerChatReducer from "../screens/user/homeservice/providers-chat/providersChatSlice";

// Provider HomeService slices
import providerDashboardReducer from "../screens/providers/homeservice/tabs/dashboard/dashboardSlice";
import providerJobsReducer from "../screens/providers/homeservice/tabs/jobs/jobSlice";
import providerEarningsReducer from "../screens/providers/homeservice/tabs/earnings/earningSlice";
import providerHomeProfileReducer from "../screens/providers/homeservice/profie-screen/profileSlice";

// Provider Job Flow slices
import jobDetailReducer from "../screens/providers/homeservice/jobdetail-screen/jobDetailSlice";
import navigationMapReducer from "../screens/providers/homeservice/map-screen/mapSlice";
import jobInProgressReducer from "../screens/providers/homeservice/job-InProgress/jobInProgressSlice";
import awaitingApprovalReducer from "../screens/providers/homeservice/awaiting-screen/awaitingScreenSlice";
import paymentRequestReducer from "../screens/providers/homeservice/payment-screen/paymentRequestSlice";
import jobCompletionReducer from "../screens/providers/homeservice/job-completion/jobCompletionSlice";

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
import appointmentConfirmReducer from '../screens/user/healthcare/appointment-confirm/appointmentConfirmSlice';

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
    // Quick Search Flow reducers
    quickSearchForm: quickSearchReducer,
    searchingProviders: searchProvidersReducer,
    providerChat: providerChatReducer,
    // Provider HomeService reducers
    dashboard: providerDashboardReducer,
    jobs: providerJobsReducer,
    earnings: providerEarningsReducer,
    profile: providerHomeProfileReducer,
    // Provider Job Flow reducers
    jobDetail: jobDetailReducer,
    navigationMap: navigationMapReducer,
    jobInProgress: jobInProgressReducer,
    awaitingApproval: awaitingApprovalReducer,
    paymentRequest: paymentRequestReducer,
    jobCompletion: jobCompletionReducer,
    // Admin Service Providers reducers
    adminSPDashboard: adminServiceProvidersDashboardReducer,
    adminSPBookings: adminServiceProvidersBookingsReducer,
    adminSPAnalytics: adminServiceProvidersAnalyticsReducer,
    // Healthcare Patient reducers
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
    // Healthcare Doctor/Provider reducers
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
    // Healthcare Admin reducers
    healthcareAnalytics: healthcareAnalyticsReducer,
    specialtyManagement: specialtyManagementReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;