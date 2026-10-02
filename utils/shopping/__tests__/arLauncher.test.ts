import { arCapability, sceneViewerIntentUrl, sceneViewerWebUrl } from '../arLauncher';

const glb = 'https://res.cloudinary.com/demo/raw/upload/v1/metromatrix/models3d/u1/chair.glb';

describe('AR launcher', () => {
  it('builds the Scene Viewer intent Google documents, with a web fallback', () => {
    const url = sceneViewerIntentUrl(glb, { title: 'Arm chair' });
    expect(url.startsWith('intent://arvr.google.com/scene-viewer/1.0?')).toBe(true);
    expect(url).toContain(`file=${encodeURIComponent(glb)}`);
    expect(url).toContain('mode=ar_preferred');
    expect(url).toContain('title=Arm%20chair');
    expect(url).toContain('package=com.google.android.googlequicksearchbox');
    expect(url).toContain(`S.browser_fallback_url=${encodeURIComponent(sceneViewerWebUrl(glb, 'Arm chair'))}`);
    expect(url.endsWith(';end;')).toBe(true);
  });

  it('the web viewer is 3D only', () => {
    expect(sceneViewerWebUrl(glb)).toBe(`https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(glb)}&mode=3d_only`);
  });

  it('picks what each phone can do', () => {
    expect(arCapability({ glbUrl: glb }, 'android')).toBe('scene_viewer');
    expect(arCapability({ glbUrl: glb, usdzUrl: 'https://x/c.usdz' }, 'ios')).toBe('quick_look');
    expect(arCapability({ glbUrl: glb }, 'ios')).toBe('web_3d');
    expect(arCapability({ glbUrl: null }, 'android')).toBe('unavailable');
    expect(arCapability(undefined, 'android')).toBe('unavailable');
  });
});
