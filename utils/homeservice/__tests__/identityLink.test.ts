import { parseIdentityLink } from '../identityLink';

const token = 'mmid1.64b7f0c2a1b2c3d4e5f60718.AbCdEf_-1234.1790000000.AbCdEfGhIjKlMnOpQrStUv';

describe('parseIdentityLink', () => {
  it('reads a badge or QR link and says how it arrived', () => {
    expect(parseIdentityLink(`metromatrix://verify?t=${token}&via=nfc`)).toEqual({ token, bookingId: '64b7f0c2a1b2c3d4e5f60718', via: 'nfc' });
    expect(parseIdentityLink(`metromatrix://verify?via=qr&t=${encodeURIComponent(token)}`)?.via).toBe('qr');
  });

  it('accepts a raw token', () => {
    expect(parseIdentityLink(` ${token} `)).toEqual({ token, bookingId: '64b7f0c2a1b2c3d4e5f60718', via: null });
  });

  it('ignores anything else a camera might see', () => {
    expect(parseIdentityLink('https://example.com/?t=x')).toBeNull();
    expect(parseIdentityLink('metromatrix://verify?via=qr')).toBeNull();
    expect(parseIdentityLink('mmid1.not-a-token')).toBeNull();
    expect(parseIdentityLink(null)).toBeNull();
  });
});
