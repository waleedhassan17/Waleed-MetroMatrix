/**
 * The console's module data layers (healthcare, shopping, wallets) against a
 * real backend, through a real store: the same RTK Query endpoints the screens
 * use, so paths, shapes, paging and error codes are all checked end to end.
 *
 * Opt-in, and separate from adminConsole.e2e (which rotates the password and
 * locks the account on purpose). Start a fresh server with the admin ready:
 *
 *   (backend)  DEV_ADMIN_PASSWORD=… DEV_ADMIN_READY=1 npm run dev:memory
 *   (app)      EXPO_PUBLIC_API_URL=http://localhost:5055/api \
 *              ADMIN_E2E_API_URL=http://localhost:5055/api ADMIN_E2E_PASSWORD=… ADMIN_E2E_MODULES=1 \
 *              npx jest e2e/adminModules --no-cache
 */

const mockStore = new Map<string, string>();
jest.mock('../utils/storage_utils/secureStorage', () => ({
  secureGetItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  secureSetItem: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  secureRemoveItem: jest.fn(async (k: string) => void mockStore.delete(k)),
  secureClearAll: jest.fn(async () => mockStore.clear()),
  isSecureKey: () => true,
  isSecure: () => true,
  SECURE_KEYS: [],
}));

import axios from 'axios';
import { configureStore } from '@reduxjs/toolkit';

const API = process.env.ADMIN_E2E_API_URL;
const PASSWORD = process.env.ADMIN_E2E_PASSWORD;
const EMAIL = process.env.ADMIN_E2E_EMAIL || 'admin@example.com';
const run = API && PASSWORD && process.env.ADMIN_E2E_MODULES === '1' ? describe : describe.skip;

run('admin console modules against a live API', () => {
  jest.setTimeout(60_000);
  let store: ReturnType<typeof makeStore>;
  let hc: typeof import('../networks/admin/healthcareApi');

  function makeStore() {
    const { adminApi } = require('../networks/admin/adminApi') as typeof import('../networks/admin/adminApi');
    return configureStore({
      reducer: { [adminApi.reducerPath]: adminApi.reducer },
      middleware: (gDM) => gDM({ serializableCheck: false, immutableCheck: false }).concat(adminApi.middleware),
    });
  }

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const net = require('../networks/network/network') as typeof import('../networks/network/network');
    expect(net.API_URL).toBe(API);
    net.MainAxiosInstance.defaults.adapter = 'fetch';
    axios.defaults.adapter = 'fetch';
    hc = require('../networks/admin/healthcareApi');
    store = makeStore();
    const auth = require('../networks/admin/auth') as typeof import('../networks/admin/auth');
    const res = await auth.signInAdmin(EMAIL, PASSWORD!);
    expect(res).toMatchObject({ step: 'signed_in', restrict: null });
  });

  afterAll(() => {
    // Ends RTK Query's cache timers, which would otherwise fire after the run.
    const { adminApi } = require('../networks/admin/adminApi') as typeof import('../networks/admin/adminApi');
    store.dispatch(adminApi.util.resetApiState());
  });

  const query = async <T>(thunk: any): Promise<T> => {
    const sub = store.dispatch(thunk) as any;
    const out = await sub;
    sub.unsubscribe?.();
    if (out.error) throw out.error;
    return out.data as T;
  };
  const mutate = async (thunk: any) => (await (store.dispatch(thunk) as any)) as { data?: any; error?: any };

  describe('healthcare', () => {
    let doctorId = '';
    let appointmentId = '';

    it('lists doctors with their provider, status counts and an id', async () => {
      const data = await query<{ pages: { items: any[]; meta: any }[] }>(hc.healthcareEndpoints.listHCDoctors.initiate({}));
      const doctor = data.pages[0].items.find((d) => d.pmcNumber === 'DEV-12345');
      expect(doctor).toMatchObject({ id: expect.any(String), verificationStatus: 'verified', providerId: { fullName: 'Sana Physician' } });
      expect(data.pages[0].meta.counts).toMatchObject({ verified: 1 });
      doctorId = doctor.id;
    });

    it('filters doctors by status and searches by name', async () => {
      const pending = await query<{ pages: { items: any[] }[] }>(hc.healthcareEndpoints.listHCDoctors.initiate({ status: 'pending' }));
      expect(pending.pages[0].items).toEqual([]);
      const found = await query<{ pages: { items: any[] }[] }>(hc.healthcareEndpoints.listHCDoctors.initiate({ search: 'Sana' }));
      expect(found.pages[0].items.map((d) => d.id)).toEqual([doctorId]);
    });

    it('opens one doctor with their counts', async () => {
      const detail = await query<any>(hc.healthcareEndpoints.getHCDoctor.initiate(doctorId));
      expect(detail.doctor.id).toBe(doctorId);
      expect(detail.stats.appointmentCount).toBe(1);
    });

    it('suspends and reactivates a doctor, with a reason', async () => {
      expect((await mutate(hc.healthcareEndpoints.setHCDoctorActive.initiate({ id: doctorId, active: false, reason: 'E2E suspend' }))).error).toBeUndefined();
      const after = await query<any>(hc.healthcareEndpoints.getHCDoctor.initiate(doctorId, { forceRefetch: true } as any));
      expect(after.doctor.isActive).toBe(false);
      expect((await mutate(hc.healthcareEndpoints.setHCDoctorActive.initiate({ id: doctorId, active: true, reason: 'E2E reactivate' }))).error).toBeUndefined();
    });

    it('refuses to verify a doctor who is already verified, with the server’s code', async () => {
      const res = await mutate(hc.healthcareEndpoints.approveHCDoctor.initiate({ id: doctorId }));
      expect(res.error).toMatchObject({ status: 409, code: expect.any(String) });
    });

    it('lists appointments and opens one with its payment trail', async () => {
      const data = await query<{ pages: { items: any[] }[] }>(hc.healthcareEndpoints.listHCAppointments.initiate({}));
      const a = data.pages[0].items[0];
      expect(a).toMatchObject({ id: expect.any(String), status: 'completed', type: 'video', payment: { status: 'paid' } });
      appointmentId = a.id;
      const detail = await query<any>(hc.healthcareEndpoints.getHCAppointment.initiate(appointmentId));
      expect(detail).toMatchObject({ id: appointmentId, patientId: { fullName: 'Ayesha Customer' }, doctorId: { providerId: { fullName: 'Sana Physician' } } });
    });

    it('filters appointments by status and type', async () => {
      const video = await query<{ pages: { items: any[] }[] }>(hc.healthcareEndpoints.listHCAppointments.initiate({ type: 'video' }));
      expect(video.pages[0].items).toHaveLength(1);
      const pending = await query<{ pages: { items: any[] }[] }>(hc.healthcareEndpoints.listHCAppointments.initiate({ status: 'pending' }));
      expect(pending.pages[0].items).toEqual([]);
    });

    it('refuses a status move the state machine forbids', async () => {
      const res = await mutate(hc.healthcareEndpoints.forceHCAppointmentStatus.initiate({ id: appointmentId, status: 'confirmed', reason: 'E2E' }));
      expect(res.error).toMatchObject({ code: 'INVALID_TRANSITION' });
    });

    it('a refund the server refuses comes back with its reason, for the sheet to show', async () => {
      // The dev seed writes this appointment without a slot, which a refund needs.
      const res = await mutate(hc.healthcareEndpoints.refundHCAppointment.initiate({ id: appointmentId, reason: 'E2E refund' }));
      expect(res.error).toMatchObject({ status: 400, code: 'VALIDATION_FAILED', message: expect.any(String) });
    });

    it('adds a specialty, hides it, and makes it bookable again', async () => {
      const saved = await mutate(
        hc.healthcareEndpoints.saveHCSpecialty.initiate({ name: 'E2E Cardiology', icon: 'heart', description: 'Heart care', commonConditions: ['Hypertension'] })
      );
      expect(saved.error).toBeUndefined();
      const list = await query<any[]>(hc.healthcareEndpoints.listHCSpecialties.initiate());
      const s = list.find((x) => x.name === 'E2E Cardiology');
      expect(s).toMatchObject({ id: expect.any(String), isActive: true, commonConditions: ['Hypertension'], doctorCount: 0 });
      expect((await mutate(hc.healthcareEndpoints.setHCSpecialtyActive.initiate({ id: s.id, active: false, reason: 'E2E hide' }))).error).toBeUndefined();
      const hidden = (await query<any[]>(hc.healthcareEndpoints.listHCSpecialties.initiate(undefined, { forceRefetch: true } as any))).find((x) => x.id === s.id);
      expect(hidden.isActive).toBe(false);
      expect((await mutate(hc.healthcareEndpoints.setHCSpecialtyActive.initiate({ id: s.id, active: true, reason: 'E2E show' }))).error).toBeUndefined();
    });

    it('lists clinics and reviews (none seeded) without an error', async () => {
      const clinics = await query<{ pages: { items: any[] }[] }>(hc.healthcareEndpoints.listHCClinics.initiate({}));
      expect(clinics.pages[0].items).toEqual([]);
      const reviews = await query<{ pages: { items: any[] }[] }>(hc.healthcareEndpoints.listHCReviews.initiate({ maxRating: 2 }));
      expect(reviews.pages[0].items).toEqual([]);
    });
  });
});
