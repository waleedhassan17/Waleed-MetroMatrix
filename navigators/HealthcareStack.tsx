import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HealthcareRouteNames } from '../navigation-maps/Healthcare';
import type { HealthcareStackParamList } from '../models/healthcare/types';

// Tab Navigator
import HealthcareTabNavigator from '../screens/user/healthcare/tabs/HealthcareTabNavigator';

// Patient-facing screens
import HealthcareHomeScreen from '../screens/user/healthcare/home/healthcareHome';
import SpecialtyListScreen from '../screens/user/healthcare/specialty-list/specialtyList';
import DoctorListScreen from '../screens/user/healthcare/doctor-list/doctorList';
import DoctorDetailScreen from '../screens/user/healthcare/doctor-detail/doctorDetail';
import DoctorSearchScreen from '../screens/user/healthcare/doctor-search/doctorSearch';
import DoctorReviewsScreen from '../screens/user/healthcare/doctor-reviews/doctorReviews';
import ClinicSelectionScreen from '../screens/user/healthcare/clinic-selection/ClinicSelectionScreen';
import SlotSelectionScreen from '../screens/user/healthcare/slot-selection/SlotSelectionScreen';
import BookAppointmentScreen from '../screens/user/healthcare/book-appointment/bookAppointment';
import BookingConfirmationScreen from '../screens/user/healthcare/booking-confirmation/BookingConfirmationScreen';
import AppointmentConfirmScreen from '../screens/user/healthcare/appointment-confirm/appointmentConfirm';
import MyAppointmentsScreen from '../screens/user/healthcare/MyAppointments/MyAppointmentsScreen';
import AppointmentDetailScreen from '../screens/user/healthcare/AppointmentDetail/AppointmentDetailScreen';
import RescheduleAppointmentScreen from '../screens/user/healthcare/RescheduleAppointment/RescheduleAppointmentScreen';
import VideoCallScreen from '../screens/user/healthcare/VideoCall/VideoCallScreen';
import PrescriptionViewScreen from '../screens/user/healthcare/prescription-view/prescriptionView';
import HealthRecordsScreen from '../screens/user/healthcare/health-records/healthRecords';
import UploadRecordScreen from '../screens/user/healthcare/upload-record/uploadRecord';
import VideoWaitingRoomScreen from '../screens/user/healthcare/VideoWaitingRoom/VideoWaitingRoomScreen';
import EmergencyScreen from '../screens/user/healthcare/emergency/EmergencyScreen';
import HealthcareNotificationsScreen from '../screens/user/healthcare/notifications/HealthcareNotificationsScreen';
import HealthcareProfileScreen from '../screens/user/healthcare/profile/HealthcareProfileScreen';

const Stack = createNativeStackNavigator<HealthcareStackParamList>();

const HealthcareStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName={HealthcareRouteNames.HealthcareTabs}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name={HealthcareRouteNames.HealthcareTabs}
        component={HealthcareTabNavigator}
      />
      <Stack.Screen
        name={HealthcareRouteNames.HealthcareHome}
        component={HealthcareHomeScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.SpecialtyList}
        component={SpecialtyListScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.DoctorList}
        component={DoctorListScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.DoctorDetail}
        component={DoctorDetailScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.DoctorSearch}
        component={DoctorSearchScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.DoctorReviews}
        component={DoctorReviewsScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.ClinicSelection}
        component={ClinicSelectionScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.SlotSelection}
        component={SlotSelectionScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.BookAppointment}
        component={BookAppointmentScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.BookingConfirmation}
        component={BookingConfirmationScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.AppointmentConfirm}
        component={AppointmentConfirmScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.MyAppointments}
        component={MyAppointmentsScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.AppointmentDetail}
        component={AppointmentDetailScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.RescheduleAppointment}
        component={RescheduleAppointmentScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.VideoCall}
        component={VideoCallScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name={HealthcareRouteNames.VideoWaitingRoom}
        component={VideoWaitingRoomScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name={HealthcareRouteNames.PrescriptionView}
        component={PrescriptionViewScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.HealthRecords}
        component={HealthRecordsScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.UploadRecord}
        component={UploadRecordScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.Emergency}
        component={EmergencyScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.HealthcareNotifications}
        component={HealthcareNotificationsScreen}
      />
      <Stack.Screen
        name={HealthcareRouteNames.HealthcareProfile}
        component={HealthcareProfileScreen}
      />
    </Stack.Navigator>
  );
};

export default HealthcareStack;
