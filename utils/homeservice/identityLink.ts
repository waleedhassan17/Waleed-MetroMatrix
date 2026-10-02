// ============================================================================
// A provider's doorstep ID, however it reached the customer's phone: an NFC
// badge, a scanned QR code (both `metromatrix://verify?t=<token>&via=…`) or a
// raw token. The token names its booking, so the verify screen can open from a
// tapped badge without being told which job it is for. Genuineness is checked
// by the server; this only recognises the shape.
// ============================================================================

export interface IdentityLink {
  token: string;
  bookingId: string;
  via: 'nfc' | 'qr' | null;
}

const TOKEN = /^mmid1\.([a-f0-9]{24})\.[A-Za-z0-9_-]{12}\.\d{10}\.[A-Za-z0-9_-]{22}$/;

function queryParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  (url.split('?')[1] || '').split('&').forEach((pair) => {
    const i = pair.indexOf('=');
    if (i > 0) {
      try {
        out[pair.slice(0, i)] = decodeURIComponent(pair.slice(i + 1));
      } catch {
        out[pair.slice(0, i)] = pair.slice(i + 1);
      }
    }
  });
  return out;
}

export function parseIdentityLink(input?: string | null): IdentityLink | null {
  const s = String(input || '').trim();
  let token = s;
  let via: IdentityLink['via'] = null;
  if (s.startsWith('metromatrix://')) {
    const params = queryParams(s);
    token = params.t || '';
    via = params.via === 'nfc' || params.via === 'qr' ? params.via : null;
  }
  const m = TOKEN.exec(token);
  return m ? { token, bookingId: m[1], via } : null;
}
