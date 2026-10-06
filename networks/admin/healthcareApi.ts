// ============================================================================
// Healthcare in the admin console (GET/PATCH/POST/DELETE /api/v1/admin/{doctors,
// appointments,clinics,specialties,healthcare/reviews}).
//
// On the admin data layer, over the typed client: paths and methods are
// checked against the contract. The backend returns these as stored records
// with their references filled in (a doctor's provider, a review's patient),
// so the shapes are declared here from the controllers
// (controllers/adminHealthcareController.js, adminDoctorController.js,
// adminSpecialtyController.js), and every record gets an `id`.
// ============================================================================

import { adminApi, nextPageParam, type AdminError, type Page, type PageParam } from './adminApi';
import { adminApi as http, type ListMeta } from './client';
import { toAdminApiError } from './errors';

/** A reference the server may send filled in or as a bare id. */
export interface HCPerson {
  _id?: string;
  id?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  city?: string;
}

export interface HCDoctorRef {
  _id: string;
  providerId?: HCPerson | string | null;
  specialtyId?: { _id: string; name: string } | string | null;
  consultationFee?: number;
  rating?: number;
}

export interface HCReview {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  patientId?: HCPerson | null;
  doctorId?: HCDoctorRef | null;
}

export interface HCClinic {
  id: string;
  name: string;
  address?: string;
  city?: string;
  isActive: boolean;
  doctorId?: HCDoctorRef | null;
  createdAt?: string;
}

export interface HCPayment {
  status?: string;
  method?: string | null;
  amount?: number;
  paidAt?: string | null;
  refundAmount?: number;
  refundedAt?: string | null;
}

export interface HCAppointment {
  id: string;
  status: string;
  type: string;
  fee?: number;
  discount?: number;
  totalAmount?: number;
  payment?: HCPayment | null;
  payout?: { amount?: number; paidAt?: string | null } | null;
  patientId?: HCPerson | null;
  patientInfo?: { name?: string } | null;
  doctorId?: HCDoctorRef | null;
  clinicId?: { _id?: string; name?: string; address?: string; city?: string } | null;
  slotId?: { date?: string; startTime?: string; endTime?: string } | null;
  cancellationReason?: string;
  createdAt: string;
}

export type DoctorVerification = 'pending' | 'verified' | 'rejected';

export interface HCDoctor {
  id: string;
  providerId?: HCPerson | null;
  specialtyId?: { _id: string; name: string } | null;
  pmcNumber?: string;
  verificationStatus: DoctorVerification;
  rejectionReason?: string;
  /** False when suspended: hidden from patient search, no new bookings. */
  isActive?: boolean;
  rating?: number;
  totalReviews?: number;
  experience?: number;
  qualifications?: string[];
  consultationFee?: number;
  videoConsultationFee?: number;
  createdAt?: string;
}

export interface HCDoctorDetail {
  doctor: HCDoctor;
  clinics: HCClinic[];
  stats: { appointmentCount: number; revenue: number; rating?: number; reviewCount: number };
}

export interface HCDashboard {
  pendingDoctorApprovals: number;
  appointmentsToday: number;
  /** Consultations paid today (completed). */
  revenueToday: number;
  /** All-time share of appointments that were cancelled; null with no appointments. */
  cancellationRate: number | null;
  openRefundCandidates: number;
  topSpecialties: { specialtyId?: string | null; name?: string | null; count: number }[];
}

/** What the server stores and enforces. Doctors are paid the full fee: there is no commission. */
export interface HCSettings {
  cancellationWindowHours: number;
  lateCancelRefundPercent: number;
}

export interface HCSpecialty {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  commonConditions?: string[];
  isActive: boolean;
  doctorCount?: number;
  appointmentCount?: number;
}

const fail = (err: unknown): { error: AdminError } => {
  const e = toAdminApiError(err);
  return { error: { status: e.status, code: e.code, message: e.message, details: e.details, requestId: e.requestId } };
};
async function run<T>(fn: () => Promise<T>): Promise<{ data: T } | { error: AdminError }> {
  try {
    return { data: await fn() };
  } catch (err) {
    return fail(err);
  }
}

/** Records carry `_id`; the console keys everything by `id`. */
const withId = <T>(record: unknown): T => {
  const r = (record ?? {}) as { _id?: unknown; id?: unknown };
  return { ...(record as object), id: String(r.id ?? r._id ?? '') } as T;
};
const asPage = <T>(res: { data: unknown; meta?: ListMeta }): Page<T> => {
  const items = Array.isArray(res.data) ? res.data.map((x) => withId<T>(x)) : [];
  return { items, meta: res.meta ?? { limit: items.length } };
};

type Q = Record<string, string | number | boolean | null | undefined>;
const FIRST_PAGE: PageParam = { page: 1 };
const PAGE_SIZE = 20;

const healthcareApi = adminApi
  .enhanceEndpoints({ addTagTypes: ['HCReview', 'HCClinic', 'HCAppointment', 'HCDoctor', 'HCSpecialty', 'HCDashboard', 'HCSettings'] })
  .injectEndpoints({
    endpoints: (build) => ({
      // ── Hub and settings ────────────────────────────────────────────────
      getHCDashboard: build.query<HCDashboard, void>({
        queryFn: () => run(async () => (await http.get('/api/v1/admin/healthcare/dashboard')).data as unknown as HCDashboard),
        providesTags: ['HCDashboard'],
      }),
      getHCSettings: build.query<HCSettings, void>({
        queryFn: () => run(async () => (await http.get('/api/v1/admin/healthcare/settings')).data as unknown as HCSettings),
        providesTags: ['HCSettings'],
      }),
      updateHCSettings: build.mutation<HCSettings, Partial<HCSettings> & { reason?: string }>({
        queryFn: (body) => run(async () => (await http.patch('/api/v1/admin/healthcare/settings', { body })).data as unknown as HCSettings),
        invalidatesTags: ['HCSettings'],
      }),

      // ── Reviews ─────────────────────────────────────────────────────────
      listHCReviews: build.infiniteQuery<Page<HCReview>, { maxRating?: number }, PageParam>({
        infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
        queryFn: ({ queryArg, pageParam }) =>
          run(async () => asPage<HCReview>(await http.get('/api/v1/admin/healthcare/reviews', { query: { ...(queryArg as Q), ...pageParam, limit: PAGE_SIZE } }))),
        providesTags: ['HCReview'],
      }),
      deleteHCReview: build.mutation<unknown, { id: string; reason: string }>({
        queryFn: ({ id, reason }) => run(async () => (await http.delete('/api/v1/admin/healthcare/reviews/{id}', { params: { id }, body: { reason } })).data),
        invalidatesTags: ['HCReview', 'HCDoctor'],
      }),

      // ── Clinics ─────────────────────────────────────────────────────────
      listHCClinics: build.infiniteQuery<Page<HCClinic>, { city?: string }, PageParam>({
        infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
        queryFn: ({ queryArg, pageParam }) =>
          run(async () => asPage<HCClinic>(await http.get('/api/v1/admin/clinics', { query: { ...(queryArg as Q), ...pageParam, limit: PAGE_SIZE } }))),
        providesTags: ['HCClinic'],
      }),
      setHCClinicActive: build.mutation<unknown, { id: string; isActive: boolean; reason: string }>({
        queryFn: ({ id, isActive, reason }) => run(async () => (await http.patch('/api/v1/admin/clinics/{id}/status', { params: { id }, body: { isActive, reason } })).data),
        invalidatesTags: ['HCClinic'],
      }),

      // ── Appointments ────────────────────────────────────────────────────
      listHCAppointments: build.infiniteQuery<Page<HCAppointment>, { status?: string; type?: string; patient?: string; doctorId?: string }, PageParam>({
        infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
        queryFn: ({ queryArg, pageParam }) =>
          run(async () => asPage<HCAppointment>(await http.get('/api/v1/admin/appointments', { query: { ...(queryArg as Q), ...pageParam, limit: PAGE_SIZE } }))),
        providesTags: ['HCAppointment'],
      }),
      getHCAppointment: build.query<HCAppointment, string>({
        queryFn: (id) => run(async () => withId<HCAppointment>((await http.get('/api/v1/admin/appointments/{id}', { params: { id } })).data)),
        providesTags: (_r, _e, id) => [{ type: 'HCAppointment', id }],
      }),
      forceHCAppointmentStatus: build.mutation<unknown, { id: string; status: string; reason: string }>({
        queryFn: ({ id, status, reason }) => run(async () => (await http.patch('/api/v1/admin/appointments/{id}/status', { params: { id }, body: { status, reason } })).data),
        invalidatesTags: (_r, _e, { id }) => [{ type: 'HCAppointment', id }, 'HCAppointment', 'Overview'],
      }),
      refundHCAppointment: build.mutation<{ refunded: number }, { id: string; reason: string }>({
        queryFn: ({ id, reason }) =>
          run(async () => (await http.post('/api/v1/admin/appointments/{id}/refund', { params: { id }, body: { reason } })).data as unknown as { refunded: number }),
        invalidatesTags: (_r, _e, { id }) => [{ type: 'HCAppointment', id }, 'HCAppointment'],
      }),

      // ── Doctors ─────────────────────────────────────────────────────────
      listHCDoctors: build.infiniteQuery<Page<HCDoctor>, { status?: string; search?: string }, PageParam>({
        infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
        queryFn: ({ queryArg, pageParam }) =>
          run(async () => asPage<HCDoctor>(await http.get('/api/v1/admin/doctors', { query: { ...(queryArg as Q), ...pageParam, limit: PAGE_SIZE } }))),
        providesTags: ['HCDoctor'],
      }),
      getHCDoctor: build.query<HCDoctorDetail, string>({
        queryFn: (doctorId) =>
          run(async () => {
            const d = (await http.get('/api/v1/admin/doctors/{doctorId}', { params: { doctorId } })).data as unknown as HCDoctorDetail;
            return { ...d, doctor: withId<HCDoctor>(d.doctor), clinics: (d.clinics ?? []).map((c) => withId<HCClinic>(c)) };
          }),
        providesTags: (_r, _e, id) => [{ type: 'HCDoctor', id }],
      }),
      approveHCDoctor: build.mutation<unknown, { id: string; notes?: string }>({
        queryFn: ({ id, notes }) => run(async () => (await http.patch('/api/v1/admin/doctors/{doctorId}/approve', { params: { doctorId: id }, body: { notes: notes ?? '' } })).data),
        invalidatesTags: ['HCDoctor', 'HCDashboard', 'Queue', 'Overview'],
      }),
      rejectHCDoctor: build.mutation<unknown, { id: string; reason: string; canReapply?: boolean }>({
        queryFn: ({ id, reason, canReapply = true }) =>
          run(async () => (await http.patch('/api/v1/admin/doctors/{doctorId}/reject', { params: { doctorId: id }, body: { reason, canReapply } })).data),
        invalidatesTags: ['HCDoctor', 'HCDashboard', 'Queue', 'Overview'],
      }),
      setHCDoctorActive: build.mutation<unknown, { id: string; active: boolean; reason: string }>({
        queryFn: ({ id, active, reason }) =>
          run(async () => (await http.patch('/api/v1/admin/doctors/{doctorId}/status', { params: { doctorId: id }, body: { status: active ? 'active' : 'suspended', reason } })).data),
        invalidatesTags: ['HCDoctor'],
      }),

      // ── Specialties ─────────────────────────────────────────────────────
      listHCSpecialties: build.query<HCSpecialty[], void>({
        queryFn: () =>
          run(async () => {
            const data = (await http.get('/api/v1/admin/specialties')).data as unknown;
            return Array.isArray(data) ? data.map((s) => withId<HCSpecialty>(s)) : [];
          }),
        providesTags: ['HCSpecialty'],
      }),
      saveHCSpecialty: build.mutation<unknown, { id?: string; name: string; icon: string; description: string; commonConditions: string[] }>({
        queryFn: ({ id, ...body }) =>
          run(async () =>
            id
              ? (await http.patch('/api/v1/admin/specialties/{id}', { params: { id }, body })).data
              : (await http.post('/api/v1/admin/specialties', { body })).data
          ),
        invalidatesTags: ['HCSpecialty', 'Meta'],
      }),
      /** Deactivating is refused while verified doctors still practise it. */
      setHCSpecialtyActive: build.mutation<unknown, { id: string; active: boolean; reason: string }>({
        queryFn: ({ id, active, reason }) =>
          run(async () =>
            active
              ? (await http.patch('/api/v1/admin/specialties/{id}', { params: { id }, body: { isActive: true, reason } })).data
              : (await http.delete('/api/v1/admin/specialties/{id}', { params: { id }, body: { reason } })).data
          ),
        invalidatesTags: ['HCSpecialty', 'Meta'],
      }),
    }),
  });

export const {
  useGetHCDashboardQuery,
  useGetHCSettingsQuery,
  useUpdateHCSettingsMutation,
  useListHCReviewsInfiniteQuery,
  useDeleteHCReviewMutation,
  useListHCClinicsInfiniteQuery,
  useSetHCClinicActiveMutation,
  useListHCAppointmentsInfiniteQuery,
  useGetHCAppointmentQuery,
  useForceHCAppointmentStatusMutation,
  useRefundHCAppointmentMutation,
  useListHCDoctorsInfiniteQuery,
  useGetHCDoctorQuery,
  useApproveHCDoctorMutation,
  useRejectHCDoctorMutation,
  useSetHCDoctorActiveMutation,
  useListHCSpecialtiesQuery,
  useSaveHCSpecialtyMutation,
  useSetHCSpecialtyActiveMutation,
} = healthcareApi;

/** The name to show for a person reference, filled in or not. */
export const nameOf = (ref: HCPerson | string | null | undefined, fallback: string): string =>
  (ref && typeof ref === 'object' && ref.fullName) || fallback;

/** The endpoints themselves, for the end-to-end tests that drive them without screens. */
export const healthcareEndpoints = healthcareApi.endpoints;
