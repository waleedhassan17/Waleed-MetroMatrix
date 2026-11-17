import { useSignOut } from '../../../hooks/useSignOut';

/**
 * Sign the doctor out: confirm in an in-app sheet, end the session, return to
 * role selection.
 *
 * The confirmation used to be a native Alert — the dark system dialog that
 * floated over the light app. Render the returned `sheet` once on the screen
 * that offers sign-out, and call `requestSignOut` from the control.
 */
export function useDoctorSignOut() {
  return useSignOut({
    message: 'You can sign back in at any time. Your schedule and patients stay as they are.',
  });
}

export default useDoctorSignOut;
