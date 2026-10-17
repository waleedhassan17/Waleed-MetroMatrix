import { healthBannerSerializer, healthConcernSerializer, healthcareHomeSerializer } from '../homeSerializer';

describe('healthcareHomeSerializer', () => {
  it('reads the live payload shape', () => {
    const home = healthcareHomeSerializer({
      city: 'Lahore',
      cities: ['Karachi', 'Lahore', ''],
      specialties: [{ _id: 's1', name: 'Cardiology', icon: 'heart', doctorCount: 2, commonConditions: ['Chest pain'] }, { name: 'No id' }],
      commonConcerns: [{ name: 'Chest pain', specialtyId: 's1', specialtyName: 'Cardiology', icon: 'heart' }, { name: '' }],
      featuredDoctors: [
        {
          _id: 'd1',
          providerId: { _id: 'p1', fullName: 'Dr. Sana Javed', profilePhoto: 'https://x/p.jpg' },
          specialtyId: { _id: 's1', name: 'Cardiology', icon: 'heart' },
          rating: 4.8,
          totalReviews: 12,
          experience: 9,
          consultationFee: 3500,
          videoConsultationFee: 3000,
          verificationStatus: 'verified',
        },
      ],
      availableToday: [{ _id: 'd2', providerId: { fullName: 'Dr. Imran' }, availableToday: true }],
      banners: [
        { id: 'b1', title: 'Video', image: 'https://x/v.jpg', targetType: 'screen', targetScreen: 'video_consultation', target: null },
        { id: 'b2', title: 'Skin', image: 'https://x/s.jpg', targetType: 'specialty', targetScreen: null, target: { id: 's9', name: 'Dermatology' } },
      ],
      upcoming: {
        _id: 'a1',
        type: 'video',
        status: 'confirmed',
        slotId: { date: '2026-10-19T19:00:00.000Z', startTime: '10:00', endTime: '10:30' },
        doctorId: { providerId: { fullName: 'Dr. Sana Javed' }, specialtyId: { name: 'Cardiology' } },
        payment: { status: 'unpaid', amount: 3000 },
      },
      emergencyNumbers: [{ label: 'Rescue 1122', number: '1122' }, { label: 'none' }],
    });

    expect(home.city).toBe('Lahore');
    expect(home.cities).toEqual(['Karachi', 'Lahore']);
    expect(home.specialties.map((s) => s.name)).toEqual(['Cardiology']);
    expect(home.commonConcerns).toEqual([{ name: 'Chest pain', specialtyId: 's1', specialtyName: 'Cardiology', icon: 'heart' }]);
    expect(home.featuredDoctors[0]).toMatchObject({ doctorId: 'd1', name: 'Dr. Sana Javed', specialtyName: 'Cardiology', isVerified: true, videoConsultationFee: 3000 });
    expect(home.availableToday[0]).toMatchObject({ doctorId: 'd2', isAvailable: true });
    expect(home.banners.map((b) => b.bannerId)).toEqual(['b1', 'b2']);
    // The clinic's calendar day (19:00Z is the 20th in Karachi), as the appointment screens read it.
    expect(home.upcoming).toMatchObject({ appointmentId: 'a1', date: '2026-10-20', doctorName: 'Dr. Sana Javed', specialtyName: 'Cardiology' });
    expect(home.upcoming?.payment.status).toBe('unpaid');
    expect(home.emergencyNumbers).toEqual([{ label: 'Rescue 1122', number: '1122' }]);
  });

  it('an empty or broken payload is an empty home in Lahore, not a crash', () => {
    for (const bad of [null, undefined, 'x', { banners: 'no', featuredDoctors: {} }]) {
      const home = healthcareHomeSerializer(bad);
      expect(home).toMatchObject({ city: 'Lahore', cities: [], specialties: [], featuredDoctors: [], availableToday: [], banners: [], upcoming: null, emergencyNumbers: [] });
    }
  });
});

describe('healthBannerSerializer', () => {
  const ok = { id: 'b1', title: 'T', image: 'https://x/y.jpg' };
  it('drops a banner with no picture, no headline, or nowhere to go', () => {
    expect(healthBannerSerializer({ ...ok, image: '' })).toBeNull();
    expect(healthBannerSerializer({ ...ok, image: 'javascript:alert(1)' })).toBeNull();
    expect(healthBannerSerializer({ ...ok, title: ' ' })).toBeNull();
    expect(healthBannerSerializer({ ...ok, targetType: 'specialty', target: null })).toBeNull();
    expect(healthBannerSerializer({ ...ok, targetType: 'screen', targetScreen: 'wallet' })).toBeNull();
  });

  it('an unknown target type is decoration only; a screen keeps no stray target', () => {
    expect(healthBannerSerializer({ ...ok, targetType: 'mystery' })).toMatchObject({ targetType: 'none', target: null, targetScreen: null });
    expect(healthBannerSerializer({ ...ok, targetType: 'screen', targetScreen: 'records', target: { id: 'x' } })).toMatchObject({
      targetScreen: 'records',
      target: null,
    });
  });
});

describe('healthConcernSerializer', () => {
  it('needs a name and the specialty that treats it', () => {
    expect(healthConcernSerializer({ name: 'Acne' })).toBeNull();
    expect(healthConcernSerializer({ name: 'Acne', specialtyId: 's1' })).toEqual({ name: 'Acne', specialtyId: 's1', specialtyName: '', icon: '' });
  });
});
