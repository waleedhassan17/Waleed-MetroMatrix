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
import ManageSlotsScreen from '../screens/providers/healthcare/manage-slots/manageSlots';
import WalletScreen from '../screens/user/wallet/WalletScreen';
import TopUpWebViewScreen from '../screens/user/wallet/TopUpWebViewScreen';

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
        name={DoctorRouteNames.Consultation}
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
        name={DoctorRouteNames.DoctorSettings}
        component={DoctorSettingsScreen}
      />
      <Stack.Screen
        name={DoctorRouteNames.ManageSlots}
        component={ManageSlotsScreen}
      />
      <Stack.Screen
        name="WalletScreen"
        component={WalletScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="TopUpWebView"
        component={TopUpWebViewScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
};

export default DoctorStack;
