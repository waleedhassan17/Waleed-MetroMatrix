import type { Appointment, HealthcareBanner, Specialty } from '../../../models/healthcare/types';
import {
  bannerCta,
  bannerRoute,
  fromFee,
  gridLabel,
  homeSpecialties,
  nextVisitAction,
  specialtyIcon,
  visitSoonLabel,
  visitTimes,
} from '../homeDisplay';

const spec = (name: string, doctorCount: number): Specialty => ({
  specialtyId: name.toLowerCase(),
  name,
  icon: '',
  description: '',
  doctorCount,
  commonConditions: [],
  isActive: true,
});

const banner = (o: Partial<HealthcareBanner>): HealthcareBanner => ({
  bannerId: 'b1',
  title: 'T',
  subtitle: '',
  image: 'https://x/y.jpg',
  targetType: 'none',
  targetScreen: null,
  target: null,
  ...o,
});

const appt = (o: Partial<Appointment>): Appointment =>
  ({
    appointmentId: 'a1',
    patientId: 'p1',
    doctorId: 'd1',
    type: 'video',
    date: '2026-10-20',
    timeSlot: { start: '10:00', end: '10:30' },
    status: 'confirmed',
    payment: { paymentId: '', amount: 2000, method: 'wallet', status: 'paid' },
    createdAt: '',
    ...o,
  }) as Appointment;

const at = (hhmm: string, day = '2026-10-20') => new Date(`${day}T${hhmm}`).getTime();

describe('homeSpecialties', () => {
  it('puts specialties with doctors first, keeps API order, caps at the grid', () => {
    const list = [spec('A', 0), spec('B', 3), spec('C', 1), spec('D', 0)];
    expect(homeSpecialties(list).map((s) => s.name)).toEqual(['B', 'C', 'A', 'D']);
    expect(homeSpecialties(list, 2).map((s) => s.name)).toEqual(['B', 'C']);
  });
});

describe('specialtyIcon', () => {
  it('reads the seed keys and the older app keys', () => {
    expect(specialtyIcon('heart')).toBe('heart-pulse');
    expect(specialtyIcon('body')).toBe('face-woman-shimmer');
    expect(specialtyIcon('child')).toBe('baby-face-outline');
    expect(specialtyIcon('female')).toBe('human-pregnant');
    expect(specialtyIcon('heart-pulse')).toBe('heart-pulse');
    expect(specialtyIcon(' Brain ')).toBe('brain');
  });

  it('falls back to a word in the name, then the stethoscope', () => {
    expect(specialtyIcon('', 'Dermatology')).toBe('face-woman-shimmer');
    expect(specialtyIcon(null, 'Paediatrics')).toBe('baby-face-outline');
    expect(specialtyIcon('unknown', 'Internal Medicine')).toBe('stethoscope');
    expect(specialtyIcon(undefined, undefined)).toBe('stethoscope');
  });
});

describe('fromFee', () => {
  it('is the lower fee that is set', () => {
    expect(fromFee({ consultationFee: 3000, videoConsultationFee: 2500 })).toBe(2500);
    expect(fromFee({ consultationFee: 3000, videoConsultationFee: 0 })).toBe(3000);
    expect(fromFee({ consultationFee: 0, videoConsultationFee: 0 })).toBe(0);
  });
});

describe('banners', () => {
  it('a specialty or doctor banner opens that list or profile, with no stale filter', () => {
    expect(bannerRoute(banner({ targetType: 'specialty', target: { id: 's1', name: 'Dermatology' } }))).toEqual({
      name: 'DoctorList',
      params: { specialtyId: 's1', specialtyName: 'Dermatology', filter: {} },
    });
    expect(bannerRoute(banner({ targetType: 'doctor', target: { id: 'd9', name: 'Dr X' } }))).toEqual({ name: 'DoctorDetail', params: { doctorId: 'd9' } });
    expect(bannerRoute(banner({ targetType: 'specialty' }))).toBeNull();
  });

  it('every screen target has a route and words for its button', () => {
    const screens = ['video_consultation', 'available_today', 'symptom_checker', 'emergency', 'records'] as const;
    const routes = screens.map((s) => bannerRoute(banner({ targetType: 'screen', targetScreen: s }))?.name);
    expect(routes).toEqual(['DoctorList', 'DoctorList', 'SymptomChecker', 'Emergency', 'HealthRecords']);
    expect(bannerRoute(banner({ targetType: 'screen', targetScreen: 'video_consultation' }))?.params).toMatchObject({ filter: { consultationType: 'video' } });
    expect(bannerRoute(banner({ targetType: 'screen', targetScreen: 'available_today' }))?.params).toMatchObject({ filter: { availability: 'today' } });
    screens.forEach((s) => expect(bannerCta(banner({ targetType: 'screen', targetScreen: s }))).toBeTruthy());
  });

  it('a decoration-only banner opens nothing and has no button', () => {
    expect(bannerRoute(banner({}))).toBeNull();
    expect(bannerCta(banner({}))).toBeNull();
    expect(bannerCta(banner({ targetType: 'specialty', target: { id: 's', name: 'S' } }))).toBe('Find a doctor');
  });
});

describe('the next visit', () => {
  it('reads its day and times; missing times give nothing', () => {
    const t = visitTimes(appt({}))!;
    expect(t.end.getTime() - t.start.getTime()).toBe(30 * 60 * 1000);
    expect(visitTimes(appt({ timeSlot: { start: '', end: '' } }))).toBeNull();
    expect(visitTimes(appt({ timeSlot: { start: '10:00', end: '' } }))!.end.getTime()).toBe(at('10:30'));
  });

  it('a confirmed video visit can be joined from 15 minutes before until it ends', () => {
    const a = appt({});
    expect(nextVisitAction(a, at('09:44'), 15)).toBeNull();
    expect(nextVisitAction(a, at('09:45'), 15)?.kind).toBe('join');
    expect(nextVisitAction(a, at('10:30'), 15)?.kind).toBe('join');
    expect(nextVisitAction(a, at('10:31'), 15)).toBeNull();
    expect(nextVisitAction(appt({ status: 'pending' }), at('10:00'), 15)).toBeNull();
    expect(nextVisitAction(appt({ type: 'in-clinic' }), at('10:00'), 15)).toBeNull();
  });

  it('otherwise a fee still owed is the thing to do', () => {
    const unpaid = { paymentId: '', amount: 2000, method: 'wallet' as const, status: 'unpaid' as const };
    expect(nextVisitAction(appt({ type: 'in-clinic', payment: unpaid }), at('08:00'), 15)?.kind).toBe('pay');
    expect(nextVisitAction(appt({ status: 'pending', payment: unpaid }), at('08:00'), 15)?.kind).toBe('pay');
    expect(nextVisitAction(appt({ status: 'cancelled', payment: unpaid }), at('08:00'), 15)).toBeNull();
  });

  it('says how soon: minutes, now, today, tomorrow, else nothing', () => {
    const a = appt({});
    expect(visitSoonLabel(a, at('09:35'))).toBe('Starts in 25 min');
    expect(visitSoonLabel(a, at('10:10'))).toBe('Now');
    expect(visitSoonLabel(a, at('07:00'))).toBe('Today');
    expect(visitSoonLabel(a, at('18:00', '2026-10-19'))).toBe('Tomorrow');
    expect(visitSoonLabel(a, at('18:00', '2026-10-17'))).toBeNull();
  });
});

describe('gridLabel', () => {
  it('shortens only the one-word names a grid cell cannot hold', () => {
    expect(gridLabel('Gastroenterology')).toBe('Gastro');
    expect(gridLabel(' ophthalmology ')).toBe('Eye care');
    expect(gridLabel('Cardiology')).toBe('Cardiology');
    expect(gridLabel('General Physician')).toBe('General Physician');
  });
});
