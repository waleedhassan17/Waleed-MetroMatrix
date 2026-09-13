import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ToastHost } from '../components/ui';
import type { DoctorStackParamList } from '../models/healthcare/types';
import { DoctorRouteNames } from '../navigation-maps/Healthcare';
import { ThemeProvider } from '../theme';

import DoctorTabNavigator from '../screens/providers/healthcare/tabs/DoctorTabNavigator';
import DoctorAppointmentDetailScreen from '../screens/providers/healthcare/appointments/DoctorAppointmentDetailScreen';
import ConsultationScreen from '../screens/providers/healthcare/medical-notes/medicalNotes';
import PrescriptionWriterScreen from '../screens/providers/healthcare/prescription-writer/prescriptionWriter';
import PatientHistoryScreen from '../screens/providers/healthcare/patient-history/patientHistory';
import EditDoctorProfileScreen from '../screens/providers/healthcare/profile/EditDoctorProfileScreen';
import AvailabilityScreen from '../screens/providers/healthcare/availability-settings/availabilitySettings';
import ManageSlotsScreen from '../screens/providers/healthcare/manage-slots/manageSlots';
import DoctorReviewsScreen from '../screens/providers/healthcare/doctor-reviews/DoctorReviewsScreen';
import DoctorNotificationsScreen from '../screens/providers/healthcare/notifications/DoctorNotificationsScreen';
import DoctorPatientsScreen from '../screens/providers/healthcare/patients/DoctorPatientsScreen';

// Wallet + top-up live ONLY in the root navigator (navigation-maps/Base.tsx).
// React Navigation bubbles an unresolved route name up to the parent, so
// navigate('WalletScreen') from any doctor screen reaches the shared screen.
//
// Schedule / Patients / Earnings / Account are TABS (DoctorTabNavigator), not
// stack routes: a second stack copy mounted another component against the same
// slice, and its unmount reset wiped the tab's data. Reach them with
// navigate(DoctorTabs, { screen: 'Schedule' }).

const Stack = createNativeStackNavigator<DoctorStackParamList>();

const DoctorStack: React.FC = () => (
  // The doctor side is the same vertical as the patient side — same accent.
  <ThemeProvider module="healthcare">
    <View style={styles.root}>
      <Stack.Navigator
        initialRouteName={DoctorRouteNames.DoctorTabs}
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        <Stack.Screen name={DoctorRouteNames.DoctorTabs} component={DoctorTabNavigator} />
        <Stack.Screen name={DoctorRouteNames.AppointmentDetail} component={DoctorAppointmentDetailScreen} />
        <Stack.Screen name={DoctorRouteNames.ConsultationNotes} component={ConsultationScreen} />
        <Stack.Screen name={DoctorRouteNames.PrescriptionWriter} component={PrescriptionWriterScreen} />
        <Stack.Screen name={DoctorRouteNames.PatientHistory} component={PatientHistoryScreen} />
        <Stack.Screen name={DoctorRouteNames.EditDoctorProfile} component={EditDoctorProfileScreen} />
        <Stack.Screen name={DoctorRouteNames.AvailabilityHub} component={AvailabilityScreen} />
        <Stack.Screen name={DoctorRouteNames.ManageSlots} component={ManageSlotsScreen} />
        <Stack.Screen name={DoctorRouteNames.DoctorMyReviews} component={DoctorReviewsScreen} />
        <Stack.Screen name={DoctorRouteNames.DoctorNotifications} component={DoctorNotificationsScreen} />
        <Stack.Screen name={DoctorRouteNames.DoctorPatients} component={DoctorPatientsScreen} />
      </Stack.Navigator>
      {/* One host for every doctor screen's confirmations and failures. */}
      <ToastHost />
    </View>
  </ThemeProvider>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default DoctorStack;
