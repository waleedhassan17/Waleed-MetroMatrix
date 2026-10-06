// ============================================================================
// Direct uploads: phone → Cloudinary, signed by our API.
//
//   1. POST /api/uploads/sign { purpose }  → a one-shot signature confined to
//      metromatrix/<purpose>/<this account>/
//   2. POST the file straight to Cloudinary with exactly those params
//   3. hand the resulting https URL to whichever endpoint uses it — the API
//      re-checks that it is this account's upload for this purpose
//
// Why not through the API: Vercel caps request bodies at 4.5 MB, and a 3D
// model or a phone photo of a lab report is often bigger. And why not the
// phone's own file path: a `file://` URI exists only on this device — that is
// what dispute "evidence" used to be.
// ============================================================================

import { apiRequest } from '../../networks/serviceProviders/config';
import { appendFile } from './appendFile';

export type UploadPurpose = 'avatar' | 'dispute_evidence' | 'health_record' | 'product_image' | 'product_model3d';

interface Signature {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
  resourceType: string;
  maxBytes: number;
}

export class UploadError extends Error {}

function guessName(uri: string, fallbackExt: string) {
  const last = uri.split('?')[0].split('/').pop() || '';
  return /\.[a-z0-9]{2,5}$/i.test(last) ? last : `upload.${fallbackExt}`;
}

function guessType(name: string, fallback: string) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    pdf: 'application/pdf',
    glb: 'model/gltf-binary',
    usdz: 'model/vnd.usdz+zip',
  };
  return map[ext] || fallback;
}

/**
 * Upload one local file. Resolves to the https URL to save; rejects with an
 * UploadError whose message is fit to show.
 */
export async function uploadAsset(
  uri: string,
  purpose: UploadPurpose,
  opts: { name?: string; mimeType?: string; sizeBytes?: number } = {}
): Promise<string> {
  const signed = await apiRequest<Signature>('/uploads/sign', {
    method: 'POST',
    body: JSON.stringify({ purpose }),
  });
  if (!signed.success || !signed.data) {
    throw new UploadError(signed.message || "We couldn't start the upload. Try again.");
  }
  const s = signed.data;
  if (opts.sizeBytes && opts.sizeBytes > s.maxBytes) {
    throw new UploadError(`That file is too large — the limit is ${Math.round(s.maxBytes / 1e6)} MB.`);
  }

  const name = opts.name || guessName(uri, purpose === 'product_model3d' ? 'glb' : 'jpg');
  const form = new FormData();
  await appendFile(form, 'file', { uri, name, type: opts.mimeType || guessType(name, 'application/octet-stream') });
  form.append('api_key', s.apiKey);
  form.append('timestamp', String(s.timestamp));
  form.append('signature', s.signature);
  form.append('folder', s.folder);
  form.append('allowed_formats', s.allowedFormats);

  let res: Response;
  try {
    res = await fetch(s.uploadUrl, { method: 'POST', body: form });
  } catch {
    throw new UploadError('The upload failed — check your connection and try again.');
  }
  const json: any = await res.json().catch(() => null);
  if (!res.ok || !json?.secure_url) {
    const reason = json?.error?.message || '';
    if (/format/i.test(reason)) throw new UploadError(`That file type isn't accepted here (${s.allowedFormats}).`);
    throw new UploadError("The upload didn't go through. Try again.");
  }
  return json.secure_url as string;
}

/** Upload several, in order; stops at the first failure. */
export async function uploadAssets(uris: string[], purpose: UploadPurpose): Promise<string[]> {
  const out: string[] = [];
  for (const uri of uris) out.push(await uploadAsset(uri, purpose));
  return out;
}
