const mockApiRequest = jest.fn();
jest.mock('../../../networks/serviceProviders/config', () => ({ apiRequest: (...a: any[]) => mockApiRequest(...a) }));

import { uploadAsset, UploadError } from '../cloudinaryUpload';

const signature = {
  uploadUrl: 'https://api.cloudinary.com/v1_1/mm/image/upload',
  apiKey: 'k',
  timestamp: 1700000000,
  signature: 'sig',
  folder: 'metromatrix/disputes/u1',
  allowedFormats: 'jpg,png',
  resourceType: 'image',
  maxBytes: 10e6,
};

class FakeFormData {
  parts: [string, any][] = [];
  append(k: string, v: any) {
    this.parts.push([k, v]);
  }
}

describe('uploadAsset', () => {
  beforeEach(() => {
    (global as any).FormData = FakeFormData;
    mockApiRequest.mockReset();
  });

  it('signs, posts the file to Cloudinary with the signed params, and returns the https URL', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: signature });
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/mm/x.jpg' }) });
    (global as any).fetch = fetchMock;

    const url = await uploadAsset('file:///tmp/photo.jpg', 'dispute_evidence');
    expect(url).toBe('https://res.cloudinary.com/mm/x.jpg');
    expect(mockApiRequest).toHaveBeenCalledWith('/uploads/sign', expect.objectContaining({ method: 'POST', body: JSON.stringify({ purpose: 'dispute_evidence' }) }));
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toBe(signature.uploadUrl);
    const parts = Object.fromEntries((init.body as FakeFormData).parts);
    expect(parts.folder).toBe('metromatrix/disputes/u1');
    expect(parts.signature).toBe('sig');
    expect(parts.file).toMatchObject({ uri: 'file:///tmp/photo.jpg', name: 'photo.jpg', type: 'image/jpeg' });
  });

  it('refuses an oversized file before uploading', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: { ...signature, maxBytes: 1000 } });
    (global as any).fetch = jest.fn();
    await expect(uploadAsset('file:///a.jpg', 'avatar', { sizeBytes: 5000 })).rejects.toBeInstanceOf(UploadError);
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  it('explains a rejected format', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: signature });
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: 'Invalid image file format' } }) });
    await expect(uploadAsset('file:///a.bmp', 'avatar')).rejects.toThrow(/isn't accepted/);
  });
});
