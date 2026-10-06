// The community date/time picker, unchanged, on Android and iOS.
//
// That package renders nothing in a browser, so on web Metro resolves
// PlatformDateTimePicker.web.tsx instead: the browser's own date and time
// input behind the same props and onChange(event, date) contract. Import the
// picker from here rather than from the package so web gets a picker too.
export { default } from '@react-native-community/datetimepicker';
export type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
