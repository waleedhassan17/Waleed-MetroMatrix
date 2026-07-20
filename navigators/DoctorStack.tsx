import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DoctorRouteNames } from '../navigation-maps/Healthcare';
import type { DoctorStackParamList } from '../models/healthcare/types';

// Tab Navigator
import DoctorTabNavigator from '../screens/providers/healthcare/tabs/DoctorTabNavigator';

// Doctor/Provider-facing screens
import DoctorDashboardScreen from '../screens/providers/healthcare/doctor-home/doctorHome';
import DoctorScheduleScreen from '../screens/providers/healthcare/doctor-schedule/doctorSchedule';
import DoctorAppointmentsScreen from '../screens/providers/healthcare/patient-queue/patientQueue';
import ConsultationScreen from '../screens/providers/healthcare/medical-notes/medicalNotes';
import PrescriptionWriterScreen from '../screens/providers/healthcare/prescription-writer/prescriptionWriter';
import PatientHistoryScreen from '../screens/providers/healthcare/patient-history/patientHistory';
import DoctorEarningsScreen from '../screens/providers/healthcare/doctor-earnings/doctorEarnings';
import DoctorProfileScreen from '../screens/providers/healthcare/profile/doctorProfile';
import DoctorSettingsScreen from '../screens/providers/healthcare/availability-settings/availabilitySettings';
import DoctorVideoConsultationScreen from '../screens/providers/healthcare/video-consultation/DoctorVideoConsultationScreen';
import DoctorReviewsScreen from '../screens/providers/healthcare/doctor-reviews/DoctorReviewsScreen';
import DoctorNotificationsScreen from '../screens/providers/healthcare/notifications/DoctorNotificationsScreen';
import DoctorPatientsScreen from '../screens/providers/healthcare/patients/DoctorPatientsScreen';
import ManageSlotsScreen from '../screens/providers/healthcare/manage-slots/manageSlots';
// Wallet + top-up live ONLY in the root navigator (navigation-maps/Base.tsx)
// now — DoctorStack used to own a local copy of both routes, which shadowed
// the shared one for anything navigating from inside this stack. React
// Navigation bubbles an unresolved route name up to the parent navigator
// automatically, so navigate('WalletScreen') from any doctor screen still
// reaches the one, shared WalletScreen.

const Stack = createNativeStackNavigator<DoctorStackParamList>();

const DoctorStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName={DoctorRouteNames.DoctorTabs}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name={DoctorRouteNames.DoctorTabs}
        component={DoctorTabNavigator}
      />
      <Stack.Screen
        name={DoctorRouteNames.DoctorDashboard}
        component={DoctorDashboardScreen}
      />
      <Stack.Screen
        name={DoctorRouteNames.DoctorSchedule}
        component={DoctorScheduleScreen}
      />
      <Stack.Screen
        name={DoctorRouteNames.DoctorAppointments}
        component={DoctorAppointmentsScreen}
      />
      <Stack.Screen
        name={DoctorRouteNames.ConsultationNotes}
        component={ConsultationScreen}
      />
      <Stack.Screen
        name={DoctorRouteNames.PrescriptionWriter}
        component={PrescriptionWriterScreen}
      />
      <Stack.Screen
        name={DoctorRouteNames.PatientHistory}
        component={PatientHistoryScreen}
      />
      <Stack.Screen
        name={DoctorRouteNames.DoctorEarnings}
        component={DoctorEarningsScreen}
      />
      <Stack.Screen
        name={DoctorRouteNames.DoctorProfile}
        component={DoctorProfileScreen}
      />
      <Stack.Screen
        name={DoctorRouteNames.DoctorAvailability}
        component={DoctorSettingsScreen}
      />
      <Stack.Screen
        name={DoctorRouteNames.ManageSlots}
        component={ManageSlotsScreen}
      />
      <Stack.Screen
        name={DoctorRouteNames.DoctorVideoConsultation}
        component={DoctorVideoConsultationScreen}
      />
      <Stack.Screen
        name={DoctorRouteNames.DoctorMyReviews}
        component={DoctorReviewsScreen}
      />
      <Stack.Screen
        name={DoctorRouteNames.DoctorNotifications}
        component={DoctorNotificationsScreen}
      />
      <Stack.Screen
        name={DoctorRouteNames.DoctorPatients}
        component={DoctorPatientsScreen}
      />
    </Stack.Navigator>
  );
};

export default DoctorStack;
