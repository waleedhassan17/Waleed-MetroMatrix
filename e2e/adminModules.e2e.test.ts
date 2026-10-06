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
  let shop: typeof import('../networks/admin/shoppingApi');
  let wallets: typeof import('../networks/admin/walletsApi');
  let auth: typeof import('../networks/admin/auth');

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
    shop = require('../networks/admin/shoppingApi');
    wallets = require('../networks/admin/walletsApi');
    store = makeStore();
    auth = require('../networks/admin/auth');
    const res = await auth.signInAdmin(EMAIL, PASSWORD!);
    expect(res).toMatchObject({ step: 'signed_in', restrict: null });
  });

  afterAll(() => {
    // Ends RTK Query's cache timers, which would otherwise fire after the run.
    const { adminApi } = require('../networks/admin/adminApi') as typeof import('../networks/admin/adminApi');
    store.dispatch(adminApi.util.resetApiState());
  });

  const client = () => (require('../networks/admin/client') as typeof import('../networks/admin/client')).adminApi;

  const query = async <T>(thunk: any): Promise<T> => {
    const sub = store.dispatch(thunk) as any;
    const out = await sub;
    sub.unsubscribe?.();
    if (out.error) throw out.error;
    return out.data as T;
  };
  const mutate = async (thunk: any) => (await (store.dispatch(thunk) as any)) as { data?: any; error?: any };

  // First, while the seed is untouched: the Overview's charts, through the
  // same endpoints and the same 30-day window the screen uses.
  describe('the home dashboard charts', () => {
    const endpoints = () => {
      require('../networks/admin/homeServicesApi');
      require('../networks/admin/healthcareAnalyticsApi');
      require('../networks/admin/shoppingApi');
      return (require('../networks/admin/adminApi') as typeof import('../networks/admin/adminApi')).adminApi.endpoints as any;
    };
    const window = () => (require('../screens/admin/overview/dashboardRange') as typeof import('../screens/admin/overview/dashboardRange')).rangeWindow(30);

    it('counts customers and each provider type, and the running total ends at the total', async () => {
      const w = window();
      const d = await query<any>(endpoints().getRegistrations.initiate({ from: w.fromKey, to: w.toKey }));
      expect(d.range).toMatchObject({ from: w.fromKey, to: w.toKey });
      expect(d.users.daily).toHaveLength(30);
      expect(d.users.before + d.users.daily.reduce((n: number, x: any) => n + x.count, 0)).toBe(d.users.total);
      expect(d.users.total).toBeGreaterThanOrEqual(1);
      expect(d.providers.types.map((t: any) => t.type)).toEqual(['doctor', 'home_service', 'vendor', 'pending']);
      expect(d.providers.types.reduce((n: number, t: any) => n + t.total, 0)).toBe(d.providers.total);
      const doctors = d.providers.types.find((t: any) => t.type === 'doctor');
      expect(doctors.total).toBeGreaterThanOrEqual(1);
      expect(doctors.byState.approved).toBeGreaterThanOrEqual(1);
      expect(doctors.breakdown.field).toBe('specialty');
      expect(d.providers.types.find((t: any) => t.type === 'vendor').total).toBeGreaterThanOrEqual(1);
    });

    it('loads every module chart over the same window', async () => {
      const w = window();
      const e = endpoints();
      const hsData = await query<any>(e.getHSAnalytics.initiate({ from: w.from, to: w.to }));
      expect(Array.isArray(hsData.bookingsOverTime) && Array.isArray(hsData.byStatus)).toBe(true);
      const shopData = await query<any>(e.getShopAnalytics.initiate({ from: w.from, to: w.to }));
      expect(shopData.gmvSeries.length).toBeGreaterThanOrEqual(1);
      const timeline = await query<any>(e.getAppointmentTimeline.initiate({ startDate: w.fromKey, endDate: w.toKey, period: 'daily' }));
      expect(timeline.period).toBe('daily');
      const bySpecialty = await query<any>(e.getRevenueBreakdown.initiate({ startDate: w.fromKey, endDate: w.toKey, groupBy: 'specialty' }));
      expect(Array.isArray(bySpecialty)).toBe(true);
    });
  });

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
  describe('shopping', () => {
    let orderId = '';
    let brandId = '';
    let newBrandId = '';
    let outletId = '';
    let bannerId = '';

    it('dashboard and analytics answer with figures', async () => {
      const dash = await query<any>(shop.shoppingEndpoints.getShopDashboard.initiate());
      expect(dash).toMatchObject({ pendingBrandApprovals: expect.any(Number), ordersToday: expect.any(Number), gmvToday: expect.any(Number) });
      const to = new Date();
      const from = new Date(to.getTime() - 30 * 86_400_000);
      const analytics = await query<any>(shop.shoppingEndpoints.getShopAnalytics.initiate({ from: from.toISOString(), to: to.toISOString() }));
      expect(analytics).toMatchObject({ gmv: 3750, totalOrders: 1 });
      expect(analytics.revenueByBrand[0]).toMatchObject({ brandName: 'Dev Threads', revenue: 3750 });
    });

    it('lists orders, filters them, and opens one with its items and history', async () => {
      const list = await query<{ pages: { items: any[] }[] }>(shop.shoppingEndpoints.listShopOrders.initiate({}));
      const order = list.pages[0].items[0];
      expect(order).toMatchObject({ id: expect.any(String), orderId: expect.any(String), odexId: 'OD-DEV-1', orderStatus: 'delivered', brandName: 'Dev Threads', customerName: 'Ayesha Customer' });
      expect(order.id).toBe(order.orderId);
      orderId = order.id;
      const pending = await query<{ pages: { items: any[] }[] }>(shop.shoppingEndpoints.listShopOrders.initiate({ status: 'pending' }));
      expect(pending.pages[0].items).toEqual([]);
      const bySearch = await query<{ pages: { items: any[] }[] }>(shop.shoppingEndpoints.listShopOrders.initiate({ search: 'OD-DEV' }));
      expect(bySearch.pages[0].items.map((o) => o.id)).toEqual([orderId]);
      const detail = await query<any>(shop.shoppingEndpoints.getShopOrder.initiate(orderId));
      expect(detail).toMatchObject({ id: orderId, total: 3750, brandOwnerId: expect.any(String) });
      expect(detail.items[0]).toMatchObject({ productName: 'Cotton Kurta', quantity: 2 });
    });

    it('refuses a status move the order state machine forbids', async () => {
      const res = await mutate(shop.shoppingEndpoints.forceShopOrderStatus.initiate({ id: orderId, status: 'pending', reason: 'E2E' }));
      expect(res.error).toMatchObject({ status: expect.any(Number), message: expect.any(String) });
    });

    it('lists brands with their owner, and opens one (the admin view, not the storefront)', async () => {
      const list = await query<{ pages: { items: any[] }[] }>(shop.shoppingEndpoints.listShopBrands.initiate({}));
      const brand = list.pages[0].items.find((b) => b.name === 'Dev Threads');
      expect(brand).toMatchObject({ id: expect.any(String), brandId: expect.any(String), status: 'active', ownerName: 'Usman Vendor' });
      brandId = brand.id;
      const detail = await query<any>(shop.shoppingEndpoints.getShopBrand.initiate(brandId));
      expect(detail).toMatchObject({ id: brandId, name: 'Dev Threads' });
    });

    it('creates a brand with the server’s default colours, suspends it, and still opens it', async () => {
      const created = await mutate(
        shop.shoppingEndpoints.createShopBrand.initiate({ name: 'E2E Brand', description: 'Made by the e2e test', contactEmail: 'e2e@example.com', categories: ['Fashion'] })
      );
      expect(created.error).toBeUndefined();
      newBrandId = created.data.id;
      expect(created.data).toMatchObject({ name: 'E2E Brand', slug: 'e2e-brand', primaryColor: expect.stringMatching(/^#/) });
      expect((await mutate(shop.shoppingEndpoints.setShopBrandStatus.initiate({ id: newBrandId, status: 'suspended', reason: 'E2E suspend' }))).error).toBeUndefined();
      // The storefront hides a suspended brand; the console must still open it.
      const detail = await query<any>(shop.shoppingEndpoints.getShopBrand.initiate(newBrandId, { forceRefetch: true } as any));
      expect(detail).toMatchObject({ id: newBrandId, status: 'suspended' });
      const updated = await mutate(shop.shoppingEndpoints.updateShopBrand.initiate({ id: newBrandId, tagline: 'Edited by e2e' }));
      expect(updated.data).toMatchObject({ tagline: 'Edited by e2e' });
    });

    it('creates an outlet, assigns a brand, recolours it, toggles it and deletes it', async () => {
      const created = await mutate(
        shop.shoppingEndpoints.createShopOutlet.initiate({ name: 'E2E Outlet', description: 'Test', phone: '0300', email: 'o@example.com', location: { address: '1 Mall Road', city: 'Lahore', state: 'Punjab' } })
      );
      expect(created.error).toBeUndefined();
      outletId = created.data.id;
      expect(created.data).toMatchObject({ outletId, isActive: true, location: { city: 'Lahore' } });
      const assigned = await mutate(shop.shoppingEndpoints.assignShopOutletBrand.initiate({ id: outletId, brandId }));
      expect(assigned.error).toBeUndefined();
      const coloured = await mutate(shop.shoppingEndpoints.setShopOutletColors.initiate({ id: outletId, colorScheme: { primaryColor: '#123456' } }));
      expect(coloured.error).toBeUndefined();
      const toggled = await mutate(shop.shoppingEndpoints.toggleShopOutlet.initiate({ id: outletId }));
      expect(toggled.data).toMatchObject({ isActive: false });
      const list = await query<{ pages: { items: any[] }[] }>(shop.shoppingEndpoints.listShopOutlets.initiate({}));
      expect(list.pages[0].items.find((o) => o.id === outletId)).toBeTruthy();
      expect((await mutate(shop.shoppingEndpoints.deleteShopOutlet.initiate({ id: outletId }))).error).toBeUndefined();
    });

    it('adds, edits and deletes a promo banner', async () => {
      const created = await mutate(shop.shoppingEndpoints.saveShopBanner.initiate({ title: 'E2E Sale', image: 'https://example.com/b.png', brandId, sortOrder: 2 }));
      expect(created.error).toBeUndefined();
      bannerId = created.data.id;
      expect(created.data).toMatchObject({ bannerId, title: 'E2E Sale', isActive: true });
      const edited = await mutate(shop.shoppingEndpoints.saveShopBanner.initiate({ id: bannerId, isActive: false }));
      expect(edited.data).toMatchObject({ isActive: false });
      expect((await mutate(shop.shoppingEndpoints.deleteShopBanner.initiate({ id: bannerId }))).error).toBeUndefined();
    });

    it('reads and saves settings, product auto-approval included', async () => {
      const settings = await query<any>(shop.shoppingEndpoints.getShopSettings.initiate());
      expect(settings).not.toHaveProperty('commissionPercent');
      const saved = await mutate(shop.shoppingEndpoints.updateShopSettings.initiate({ autoApproveProducts: false, reason: 'E2E' }));
      expect(saved.data).toMatchObject({ autoApproveProducts: false });
      await mutate(shop.shoppingEndpoints.updateShopSettings.initiate({ autoApproveProducts: true, reason: 'E2E restore' }));
    });

    it('lists products for moderation', async () => {
      const list = await query<{ pages: { items: any[]; meta: any }[] }>(shop.shoppingEndpoints.listShopProducts.initiate({ moderationStatus: 'pending' }));
      expect(Array.isArray(list.pages[0].items)).toBe(true);
    });

    it('the server takes exactly what the brand, outlet and settings forms send', async () => {
      const { EMPTY_BRAND, brandPayload } = require('../screens/admin/Shopping/shared/brandForm');
      const { EMPTY_OUTLET, outletPayload } = require('../screens/admin/Shopping/shared/outletForm');
      const { settingsFormFrom, settingsPatch } = require('../screens/admin/Shopping/shared/settingsForm');

      const brandDraft = { ...EMPTY_BRAND, name: 'Form Brand', description: 'From the form', contactEmail: 'form@example.com', categories: ['Men'], paymentMethods: ['cod'] };
      const brand = await mutate(shop.shoppingEndpoints.createShopBrand.initiate(brandPayload(brandDraft, 'create')));
      expect(brand.error).toBeUndefined();
      expect(brand.data).toMatchObject({ slug: 'form-brand', status: 'active', primaryColor: expect.stringMatching(/^#/) });
      const edited = await mutate(shop.shoppingEndpoints.updateShopBrand.initiate({ id: brand.data.id, ...brandPayload({ ...brandDraft, tagline: 'Edited' }, 'edit') }));
      expect(edited.error).toBeUndefined();
      expect(edited.data).toMatchObject({ tagline: 'Edited', policies: { returnDays: 7, paymentMethods: ['cod'] } });

      const outletDraft = { ...EMPTY_OUTLET, name: 'Form Outlet', address: '9 Canal Road', city: 'Lahore', phone: '0300 1234567', brandId: brand.data.id };
      const outlet = await mutate(shop.shoppingEndpoints.createShopOutlet.initiate(outletPayload(outletDraft, 'create')));
      expect(outlet.error).toBeUndefined();
      expect(outlet.data).toMatchObject({ name: 'Form Outlet', brandId: brand.data.id, location: { city: 'Lahore' } });
      const outletEdit = await mutate(
        shop.shoppingEndpoints.updateShopOutlet.initiate({ id: outlet.data.id, ...outletPayload({ ...outletDraft, city: 'Karachi', colorScheme: { primaryColor: '#112233' } }, 'edit') })
      );
      expect(outletEdit.error).toBeUndefined();
      expect(outletEdit.data).toMatchObject({ location: { city: 'Karachi' }, colorScheme: { primaryColor: '#112233' } });
      await mutate(shop.shoppingEndpoints.deleteShopOutlet.initiate({ id: outlet.data.id }));
      await mutate(shop.shoppingEndpoints.deleteShopBrand.initiate({ id: brand.data.id, reason: 'E2E cleanup' }));

      const current = await query<any>(shop.shoppingEndpoints.getShopSettings.initiate(undefined, { forceRefetch: true } as any));
      const form = settingsFormFrom(current);
      const saved = await mutate(shop.shoppingEndpoints.updateShopSettings.initiate({ ...settingsPatch({ ...form, autoApproveProducts: !form.autoApproveProducts }), reason: 'E2E form' }));
      expect(saved.error).toBeUndefined();
      expect(saved.data.autoApproveProducts).toBe(!form.autoApproveProducts);
      await mutate(shop.shoppingEndpoints.updateShopSettings.initiate({ ...settingsPatch(form), reason: 'E2E restore' }));
    });

    it('deletes a brand, with a reason', async () => {
      expect((await mutate(shop.shoppingEndpoints.deleteShopBrand.initiate({ id: newBrandId, reason: 'E2E cleanup' }))).error).toBeUndefined();
    });
  });
  describe('restoring a deleted account', () => {
    it('a deleted provider is listed for a super admin and can be restored, with a reason', async () => {
      const api = require('../networks/admin/adminApi') as typeof import('../networks/admin/adminApi');
      const pending = await query<{ pages: { items: any[] }[] }>(api.adminApi.endpoints.listProviders.initiate({ state: 'pending' }));
      const provider = pending.pages[0].items.find((p) => p.email === 'provider@example.com');
      expect(provider).toBeTruthy();

      const deleted = await mutate(api.adminApi.endpoints.deleteProvider.initiate({ id: provider.id, reason: 'E2E delete' }));
      expect(deleted.error).toBeUndefined();

      const list = await query<{ pages: { items: any[]; meta: any }[] }>(api.adminApi.endpoints.listProviders.initiate({ state: 'deleted' }));
      expect(list.pages[0].items).toEqual([expect.objectContaining({ id: provider.id, email: 'provider@example.com', deleteReason: 'E2E delete', deletedAt: expect.any(String) })]);
      expect(list.pages[0].meta.counts.deleted).toBe(1);

      const restored = await mutate(api.adminApi.endpoints.restoreProvider.initiate({ id: provider.id, reason: 'E2E restore' }));
      expect(restored.error).toBeUndefined();
      const back = await query<{ pages: { items: any[] }[] }>(api.adminApi.endpoints.listProviders.initiate({ state: 'pending' }, { forceRefetch: true } as any));
      expect(back.pages[0].items.map((p) => p.id)).toContain(provider.id);
    });
  });

  describe('wallets and a second super admin (maker-checker)', () => {
    let walletId = '';
    let adjustmentId = '';
    let start = 0;
    let driftBefore = 0;
    const second = { email: `second-${Date.now()}@example.com`, password: `${PASSWORD}-second-1` };
    const balanceNow = async () => (await query<any>(wallets.walletEndpoints.walletTransactions.initiate(walletId, { forceRefetch: true } as any))).pages[0].wallet.balance;

    it('lists wallets with their owner and balance, and searches them', async () => {
      const list = await query<{ pages: { items: any[] }[] }>(wallets.walletEndpoints.listWallets.initiate({ ownerType: 'User' }));
      const w = list.pages[0].items.find((x) => x.ownerName === 'Ayesha Customer');
      expect(w).toMatchObject({ id: expect.any(String), ownerType: 'User', balance: expect.any(Number), currency: expect.any(String) });
      walletId = w.id;
      start = w.balance;
      const found = await query<{ pages: { items: any[] }[] }>(wallets.walletEndpoints.listWallets.initiate({ search: 'ayesha' }));
      expect(found.pages[0].items.map((x) => x.id)).toContain(walletId);
      driftBefore = (await query<any>(wallets.walletEndpoints.getReconciliation.initiate())).drift;
    });

    it('shows a wallet’s ledger, the seeded top-up included', async () => {
      const ledger = await query<any>(wallets.walletEndpoints.walletTransactions.initiate(walletId));
      expect(ledger.pages[0].wallet.balance).toBe(start);
      expect(ledger.pages[0].items.find((t: any) => t.source === 'stripe_topup')).toMatchObject({ id: expect.any(String), type: 'credit', amount: 5000 });
    });

    it('a small adjustment is applied at once', async () => {
      const res = await mutate(wallets.walletEndpoints.adjustWallet.initiate({ id: walletId, type: 'debit', amount: 100, reason: 'E2E small debit' }));
      expect(res.error).toBeUndefined();
      expect(res.data).toMatchObject({ requiresApproval: false, wallet: { balance: start - 100 } });
    });

    it('a large one waits for approval, and its requester cannot approve it', async () => {
      const res = await mutate(wallets.walletEndpoints.adjustWallet.initiate({ id: walletId, type: 'credit', amount: 20000, reason: 'E2E large credit' }));
      expect(res.error).toBeUndefined();
      expect(res.data).toMatchObject({ requiresApproval: true, adjustment: { status: 'pending' } });
      adjustmentId = res.data.adjustment.id;
      expect(await balanceNow()).toBe(start - 100);
      const pending = await query<{ pages: { items: any[] }[] }>(wallets.walletEndpoints.listAdjustments.initiate({ status: 'pending' }));
      expect(pending.pages[0].items.map((a) => a.id)).toContain(adjustmentId);
      const own = await mutate(wallets.walletEndpoints.decideAdjustment.initiate({ id: adjustmentId, decision: 'approve' }));
      expect(own.error).toMatchObject({ code: 'SECOND_APPROVER_REQUIRED' });
    });

    it('a second super admin, created in Admin Management, signs in and approves it', async () => {
      const created = await client().post('/api/admin/admins', { body: { email: second.email, fullName: 'Second Admin', role: 'super_admin' } as never });
      const temporary = (created.data as any).temporaryPassword as string;
      expect(temporary).toEqual(expect.any(String));

      const signIn = await auth.signInAdmin(second.email, temporary);
      expect(signIn).toMatchObject({ step: 'signed_in', restrict: 'password_change' });
      const changed = await auth.changeAdminPassword(temporary, second.password);
      expect(changed.restrict).toBeNull();

      store.dispatch(require('../networks/admin/adminApi').adminApi.util.resetApiState());
      const approved = await mutate(wallets.walletEndpoints.decideAdjustment.initiate({ id: adjustmentId, decision: 'approve', note: 'E2E second approver' }));
      expect(approved.error).toBeUndefined();
      expect(await balanceNow()).toBe(start - 100 + 20000);
    });

    it('adjustments keep the books consistent: the ledger check moves by nothing', async () => {
      const r = await query<any>(wallets.walletEndpoints.getReconciliation.initiate(undefined, { forceRefetch: true } as any));
      expect(r.drift).toBe(driftBefore);
      expect(r.netAdjustments).toBe(19900);
      expect(r.platformWalletBalance).toBe(0);
    });
  });
});

