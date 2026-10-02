// ============================================================================
// "View in your room" — opens a product's 3D model in the phone's own AR viewer.
//
// No AR engine ships in the app. Android hands the .glb to Google's Scene
// Viewer (part of the Google app / Play Services for AR): with ARCore it places
// the model in the room at true scale; without it, `ar_preferred` falls back to
// an interactive 3D view. iPhone opens a .usdz in AR Quick Look. Where neither
// exists, the model opens in Scene Viewer's web viewer (3D, no AR).
// ============================================================================

import { Linking, Platform } from 'react-native';

import type { ProductModel3d } from '../../types/shopping';

const SCENE_VIEWER = 'https://arvr.google.com/scene-viewer/1.0';

/** Scene Viewer's web page for a model — 3D in a browser, no AR. */
export function sceneViewerWebUrl(glbUrl: string, title?: string): string {
  const q = [`file=${encodeURIComponent(glbUrl)}`, 'mode=3d_only'];
  if (title) q.push(`title=${encodeURIComponent(title)}`);
  return `${SCENE_VIEWER}?${q.join('&')}`;
}

/**
 * The Android intent that opens Scene Viewer in AR (falling back to its 3D
 * view on phones without ARCore, and to the web viewer without the Google app).
 * Format: developers.google.com/ar/develop/scene-viewer
 */
export function sceneViewerIntentUrl(glbUrl: string, { title, link }: { title?: string; link?: string } = {}): string {
  const q = [`file=${encodeURIComponent(glbUrl)}`, 'mode=ar_preferred', 'resizable=false'];
  if (title) q.push(`title=${encodeURIComponent(title)}`);
  if (link) q.push(`link=${encodeURIComponent(link)}`);
  const fallback = encodeURIComponent(sceneViewerWebUrl(glbUrl, title));
  return (
    `intent://arvr.google.com/scene-viewer/1.0?${q.join('&')}` +
    `#Intent;scheme=https;package=com.google.android.googlequicksearchbox;` +
    `action=android.intent.action.VIEW;S.browser_fallback_url=${fallback};end;`
  );
}

export type ArLaunch = 'scene_viewer' | 'quick_look' | 'web_3d' | 'unavailable';

/** What this phone can do with this model — decides the button label. */
export function arCapability(model?: ProductModel3d | null, os: string = Platform.OS): ArLaunch {
  if (!model?.glbUrl) return 'unavailable';
  if (os === 'android') return 'scene_viewer';
  if (os === 'ios') return model.usdzUrl ? 'quick_look' : 'web_3d';
  return 'web_3d';
}

/** Opens the model. Resolves to what was opened; never throws. */
export async function openInAR(model: ProductModel3d | null | undefined, title?: string): Promise<ArLaunch> {
  const how = arCapability(model);
  if (how === 'unavailable' || !model?.glbUrl) return 'unavailable';
  try {
    if (how === 'scene_viewer') {
      await Linking.openURL(sceneViewerIntentUrl(model.glbUrl, { title }));
    } else if (how === 'quick_look' && model.usdzUrl) {
      await Linking.openURL(model.usdzUrl);
    } else {
      await Linking.openURL(sceneViewerWebUrl(model.glbUrl, title));
    }
    return how;
  } catch {
    // No handler for the intent (no Google app): the web viewer still shows it in 3D.
    try {
      await Linking.openURL(sceneViewerWebUrl(model.glbUrl, title));
      return 'web_3d';
    } catch {
      return 'unavailable';
    }
  }
}
