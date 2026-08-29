// ============================================================================
// The ringtone for an incoming call.
//
// Until now the only signal an incoming call gave was a vibration, with a
// comment explaining that no audio library was installed. So a call arriving
// while the app was open was, in every practical sense, silent — and the push
// that might have made a sound is deliberately suppressed in that exact case
// (services/push/pushNotifications.ts), on the assumption that the in-app sheet
// would announce itself. It did not. This is the missing half.
//
// SEQUENCING WITH WebRTC IS THE WHOLE DIFFICULTY.
// A ringtone and a call want the same audio hardware. If the ringtone is still
// playing when usePeerConnection calls getUserMedia, Android may hand the call
// a route that is already owned by media playback and the call starts with no
// audio, or audio out of the earpiece at ringer volume. So stop() must be
// awaited before the peer connection starts, and it must be safe to call from
// every teardown path — accept, decline, remote hangup, timeout, unmount.
//
// Everything here is best-effort and never throws. A call that connects without
// a ringtone is a small problem; a ringtone that prevents a call from
// connecting is a much larger one.
// ============================================================================

import { Platform } from 'react-native';

/** The module is required lazily so a build without the native audio module
 *  degrades to vibration-only rather than failing to start. */
function loadAudio(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-audio');
  } catch {
    return null;
  }
}

let player: any = null;
let starting = false;

/**
 * Start the looping ringtone. Safe to call twice — the second call is ignored
 * rather than layering a second tone over the first.
 */
export async function startRingtone(): Promise<void> {
  if (player || starting) return;
  starting = true;
  try {
    const audio = loadAudio();
    if (!audio?.createAudioPlayer) return;

    // Ring THROUGH the silent switch and through other audio. Someone who has
    // silenced their phone still expects a call to ring; and without this an
    // iPhone on silent gives no indication at all, since the vibration is a
    // single buzz there.
    await audio
      .setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
      })
      .catch(() => {});

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const p = audio.createAudioPlayer(require('../../assets/sounds/ringtone.wav'));
    p.loop = true;
    // The asset is a 2s tone followed by 3s of silence, so looping it produces
    // a real telephone cadence rather than a continuous drone.
    p.volume = 1.0;
    p.play();
    player = p;
  } catch {
    /* vibration remains the fallback signal */
  } finally {
    starting = false;
  }
}

/**
 * Stop and release. MUST be awaited before WebRTC takes the microphone.
 * Idempotent — every teardown path calls it, often more than once.
 */
export async function stopRingtone(): Promise<void> {
  const p = player;
  player = null;
  if (!p) return;
  try {
    p.pause();
    p.remove();
  } catch {
    /* already released */
  }
  // Hand the audio session back so the call can claim it cleanly. iOS is the
  // strict one here; on Android this is a no-op in practice but harmless.
  if (Platform.OS === 'ios') {
    try {
      const audio = loadAudio();
      await audio?.setAudioModeAsync?.({ playsInSilentMode: false }).catch(() => {});
    } catch {
      /* nothing to restore */
    }
  }
}

/** For teardown paths that cannot await. */
export function stopRingtoneSync(): void {
  void stopRingtone();
}
