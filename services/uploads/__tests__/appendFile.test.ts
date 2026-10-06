import { appendFile } from '../appendFile';

const makeForm = () => {
  const append = jest.fn();
  return { form: { append } as unknown as FormData, append };
};

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

describe('appendFile', () => {
  it('hands native FormData the { uri, name, type } it streams from disk', async () => {
    const { form, append } = makeForm();
    const file = { uri: 'file:///data/photo.jpg', name: 'photo.jpg', type: 'image/jpeg' };
    await appendFile(form, 'profilePhoto', file, 'android');
    expect(append).toHaveBeenCalledWith('profilePhoto', file);
  });

  it('sends a real Blob with its file name in a browser, never "[object Object]"', async () => {
    global.fetch = jest.fn(async () => ({ blob: async () => new Blob(['png-bytes'], { type: 'image/png' }) })) as any;
    const { form, append } = makeForm();
    await appendFile(form, 'files', { uri: 'blob:http://localhost:8082/1f2e', name: 'scan.png', type: 'image/png' }, 'web');

    expect(global.fetch).toHaveBeenCalledWith('blob:http://localhost:8082/1f2e');
    const [field, value, name] = append.mock.calls[0];
    expect(field).toBe('files');
    expect(value).toBeInstanceOf(Blob);
    expect(name).toBe('scan.png');
  });

  it('types an untyped blob from the picked file, since the server checks MIME types', async () => {
    global.fetch = jest.fn(async () => ({ blob: async () => new Blob(['%PDF']) })) as any;
    const { form, append } = makeForm();
    await appendFile(form, 'document', { uri: 'blob:x', name: 'licence.pdf', type: 'application/pdf' }, 'web');
    expect((append.mock.calls[0][1] as Blob).type).toBe('application/pdf');
  });
});
