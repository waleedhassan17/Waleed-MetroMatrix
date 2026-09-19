// ============================================
// Healthcare — downloading and sharing documents
// ============================================
//
// Four places in the patient app hand the user a file: the appointment invoice,
// a prescription PDF (from its own screen and from the list), and a health
// record. They used to do four different things, three of which did not work:
//
//   - `Share.share({ url })` — React Native's Share IGNORES `url` on Android and
//     shares `message` instead, so "Download Invoice" pasted a sentence into
//     whatever app the user picked and never produced a file.
//   - `Linking.openURL(pdfEndpoint)` — the endpoint is behind `requireUser`, and
//     an external browser carries no bearer token, so it opened on a 401.
//   - `setTimeout(1000)` — a placeholder that spun a spinner and did nothing.
//
// One path now: fetch the bytes (with the token when the route needs it), then
// hand the local file to the OS share sheet, where "Save to Files" / "Save to
// Drive" are a real download.

// expo-file-system 19 replaced the top-level API with Paths/File/Directory and
// moved `documentDirectory` + `downloadAsync` to this legacy entry point. The
// legacy path is the documented migration target and is what supports passing
// request headers, which the authenticated downloads need.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';
import { API_URL } from '../../networks/network/network';
import { getAccessToken } from '../storage_utils/storageUtils';

/** Strip anything a filesystem or a share sheet would object to. */
function safeFileName(name: string): string {
  return name.replace(/[^\w.\- ]+/g, '_').trim() || 'document';
}

/**
 * Best-guess content type from a URL, for files we did not generate ourselves.
 *
 * Health records are user uploads and may be PDF, JPEG or PNG
 * (`HEALTH_RECORD_ALLOWED_MIME`), so assuming PDF would mislabel half of them
 * and the receiving app would refuse to open the file.
 */
export function mimeTypeForUrl(url: string): string {
  const ext = (url.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    default:
      // The share sheet copes with an unknown type far better than with a wrong
      // one — a mislabelled PDF opens in nothing at all.
      return 'application/octet-stream';
  }
}

/** The UTI iOS wants alongside the mime type. */
function utiFor(mimeType: string): string | undefined {
  switch (mimeType) {
    case 'application/pdf':
      return 'com.adobe.pdf';
    case 'image/png':
      return 'public.png';
    case 'image/jpeg':
      return 'public.jpeg';
    default:
      return undefined;
  }
}

function describeFailure(status: number): string {
  if (status === 401 || status === 403) {
    return 'You are not authorised to download this document.';
  }
  if (status === 404) {
    return 'This document is no longer available.';
  }
  return 'The document could not be downloaded.';
}

/**
 * Download a token-guarded document to the app's document directory.
 *
 * `path` is relative to `API_URL`, e.g.
 * `/v1/healthcare/appointments/<id>/invoice`. Returns the local file URI.
 */
export async function downloadAuthedFile(
  path: string,
  filename: string
): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again to download this document.');

  const target = `${FileSystem.documentDirectory}${safeFileName(filename)}`;
  const result = await FileSystem.downloadAsync(`${API_URL}${path}`, target, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (result.status !== 200) throw new Error(describeFailure(result.status));
  return result.uri;
}

/**
 * Download a document that needs no credentials — a health-record file on
 * Cloudinary, for instance. Returns the local file URI.
 */
export async function downloadPublicFile(
  url: string,
  filename: string
): Promise<string> {
  const target = `${FileSystem.documentDirectory}${safeFileName(filename)}`;
  const result = await FileSystem.downloadAsync(url, target);

  if (result.status !== 200) throw new Error(describeFailure(result.status));
  return result.uri;
}

/**
 * Hand a local file to the OS so the user can save it or send it on.
 *
 * This is what makes a download a download: the share sheet is where "Save to
 * Files" and "Save to Drive" live. `Share.share` is the fallback for the rare
 * platform where `expo-sharing` reports itself unavailable — it attaches the
 * file on iOS, and on Android it at least offers something rather than failing
 * silently.
 */
export async function saveOrShareFile(
  uri: string,
  opts: { mimeType: string; dialogTitle: string }
): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: opts.mimeType,
      UTI: utiFor(opts.mimeType),
      dialogTitle: opts.dialogTitle,
    });
    return;
  }
  await Share.share({ url: uri, title: opts.dialogTitle });
}

/** Download a token-guarded PDF and open the save/share sheet on it. */
export async function downloadAndShareAuthedPdf(
  path: string,
  filename: string,
  dialogTitle: string
): Promise<void> {
  const uri = await downloadAuthedFile(path, filename);
  await saveOrShareFile(uri, { mimeType: 'application/pdf', dialogTitle });
}
