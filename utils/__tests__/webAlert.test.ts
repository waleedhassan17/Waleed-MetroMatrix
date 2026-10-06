import { Alert } from 'react-native';
import {
  __resetWebAlerts,
  installWebAlert,
  resolveWebAlert,
  showWebAlert,
  subscribeWebAlerts,
  type WebAlertRequest,
} from '../webAlert';

let shown: readonly WebAlertRequest[] = [];
let unsubscribe: () => void;

beforeEach(() => {
  __resetWebAlerts();
  unsubscribe = subscribeWebAlerts((q) => {
    shown = q;
  });
});
afterEach(() => unsubscribe());

describe('web Alert.alert', () => {
  it('gives an alert with no buttons a single OK, as native does', () => {
    showWebAlert('Saved');
    expect(shown).toHaveLength(1);
    expect(shown[0].buttons).toEqual([{ text: 'OK' }]);
  });

  it('runs the pressed button after closing, so its own alert shows next', () => {
    const order: string[] = [];
    showWebAlert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel', onPress: () => order.push('cancel') },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          order.push(`logout with ${shown.length} open`);
          showWebAlert('Signed out');
        },
      },
    ]);
    resolveWebAlert(shown[0].id, shown[0].buttons[1]);
    expect(order).toEqual(['logout with 0 open']);
    expect(shown.map((a) => a.title)).toEqual(['Signed out']);
  });

  it('queues alerts and shows them oldest first', () => {
    showWebAlert('First');
    showWebAlert('Second');
    expect(shown.map((a) => a.title)).toEqual(['First', 'Second']);
    resolveWebAlert(shown[0].id, shown[0].buttons[0]);
    expect(shown.map((a) => a.title)).toEqual(['Second']);
  });

  it('calls onDismiss when closed without a button', () => {
    const onDismiss = jest.fn();
    showWebAlert('Note', undefined, undefined, { cancelable: true, onDismiss });
    resolveWebAlert(shown[0].id);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(shown).toHaveLength(0);
  });

  it('ignores a second resolve of the same alert', () => {
    const onPress = jest.fn();
    showWebAlert('Once', undefined, [{ text: 'OK', onPress }]);
    const { id, buttons } = shown[0];
    resolveWebAlert(id, buttons[0]);
    resolveWebAlert(id, buttons[0]);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('replaces Alert.alert on web only', () => {
    const native = Alert.alert;
    installWebAlert('ios');
    expect(Alert.alert).toBe(native);
    installWebAlert('web');
    expect(Alert.alert).toBe(showWebAlert);
    Alert.alert = native;
  });
});
