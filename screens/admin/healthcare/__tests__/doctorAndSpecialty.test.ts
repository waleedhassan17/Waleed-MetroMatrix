import { doctorActions, doctorSubtitle } from '../DoctorManagement/doctorRow';
import { filterSpecialties, specialtySubtitle } from '../SpecialtyManagement/specialtyList';
import type { HCSpecialty } from '../../../../networks/admin/healthcareApi';

describe('doctor decisions', () => {
  it('offers what the doctor’s state allows', () => {
    expect(doctorActions({ verificationStatus: 'pending' })).toEqual(['verify', 'reject']);
    expect(doctorActions({ verificationStatus: 'rejected' })).toEqual(['verify']);
    expect(doctorActions({ verificationStatus: 'verified', isActive: true })).toEqual(['suspend']);
    expect(doctorActions({ verificationStatus: 'verified' })).toEqual(['suspend']);
    expect(doctorActions({ verificationStatus: 'verified', isActive: false })).toEqual(['reactivate']);
  });

  it('describes a doctor with whatever is known', () => {
    expect(doctorSubtitle({ specialtyId: { _id: 's', name: 'Cardiology' }, pmcNumber: '123-P', experience: 8 })).toBe('Cardiology · PMC 123-P · 8 years');
    expect(doctorSubtitle({ experience: 1 })).toBe('1 year');
    expect(doctorSubtitle({ specialtyId: null })).toBe('');
  });
});

describe('specialty list', () => {
  const list: HCSpecialty[] = [
    { id: '1', name: 'Cardiology', isActive: true, commonConditions: ['Hypertension'], doctorCount: 3, appointmentCount: 41 },
    { id: '2', name: 'Dermatology', isActive: false, commonConditions: ['Acne'], doctorCount: 0, appointmentCount: 0 },
  ];

  it('filters by status and by name or condition', () => {
    expect(filterSpecialties(list, 'all', '').map((s) => s.id)).toEqual(['1', '2']);
    expect(filterSpecialties(list, 'active', '').map((s) => s.id)).toEqual(['1']);
    expect(filterSpecialties(list, 'inactive', '').map((s) => s.id)).toEqual(['2']);
    expect(filterSpecialties(list, 'all', 'acne').map((s) => s.id)).toEqual(['2']);
    expect(filterSpecialties(list, 'all', ' CARDIO ').map((s) => s.id)).toEqual(['1']);
  });

  it('counts doctors and appointments', () => {
    expect(specialtySubtitle(list[0])).toBe('3 doctors · 41 appointments');
    expect(specialtySubtitle({ doctorCount: 1, appointmentCount: 1 })).toBe('1 doctor · 1 appointment');
    expect(specialtySubtitle({ description: 'Skin' })).toBe('Skin');
  });
});
