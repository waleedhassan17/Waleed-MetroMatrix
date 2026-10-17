import type {
  EmergencyNumber,
  HealthBannerScreen,
  HealthConcern,
  HealthcareBanner,
  HealthcareHome,
} from '../../models/healthcare/types';
import { appointmentSerializer, doctorSerializer, specialtySerializer } from './healthcareSerializer';

// GET /home → the Health home. Defensive, field by field: a malformed entry is
// dropped rather than rendered half-empty, and a missing list is empty.

const BANNER_SCREENS: HealthBannerScreen[] = ['video_consultation', 'available_today', 'symptom_checker', 'emergency', 'records'];
const TARGET_TYPES: HealthcareBanner['targetType'][] = ['specialty', 'doctor', 'screen', 'none'];

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const list = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const present = <T,>(v: T | null): v is T => v !== null;

/** A banner, or null when it has no picture, no headline, or leads nowhere. */
export function healthBannerSerializer(data: any): HealthcareBanner | null {
  const bannerId = text(data?.id || data?._id);
  const title = text(data?.title);
  const image = text(data?.image);
  if (!bannerId || !title || !/^https?:\/\//.test(image)) return null;
  const targetType = TARGET_TYPES.includes(data?.targetType) ? data.targetType : 'none';
  const target = data?.target && text(data.target.id) ? { id: text(data.target.id), name: text(data.target.name) } : null;
  const targetScreen: HealthBannerScreen | null = BANNER_SCREENS.includes(data?.targetScreen) ? data.targetScreen : null;
  if ((targetType === 'specialty' || targetType === 'doctor') && !target) return null;
  if (targetType === 'screen' && !targetScreen) return null;
  return {
    bannerId,
    title,
    subtitle: text(data?.subtitle),
    image,
    targetType,
    targetScreen: targetType === 'screen' ? targetScreen : null,
    target: targetType === 'specialty' || targetType === 'doctor' ? target : null,
  };
}

export function healthConcernSerializer(data: any): HealthConcern | null {
  const name = text(data?.name);
  const specialtyId = text(data?.specialtyId);
  if (!name || !specialtyId) return null;
  return { name, specialtyId, specialtyName: text(data?.specialtyName), icon: text(data?.icon) };
}

const emergencyNumberSerializer = (data: any): EmergencyNumber | null => {
  const number = text(data?.number);
  return number ? { label: text(data?.label) || number, number } : null;
};

export function healthcareHomeSerializer(data: any): HealthcareHome {
  return {
    city: text(data?.city) || 'Lahore',
    cities: list(data?.cities).map(text).filter(Boolean),
    specialties: list(data?.specialties).map(specialtySerializer).filter((s) => s.specialtyId && s.name),
    commonConcerns: list(data?.commonConcerns).map(healthConcernSerializer).filter(present),
    featuredDoctors: list(data?.featuredDoctors).map(doctorSerializer).filter((d) => d.doctorId),
    availableToday: list(data?.availableToday).map(doctorSerializer).filter((d) => d.doctorId),
    banners: list(data?.banners).map(healthBannerSerializer).filter(present),
    upcoming: data?.upcoming && typeof data.upcoming === 'object' ? appointmentSerializer(data.upcoming) : null,
    emergencyNumbers: list(data?.emergencyNumbers).map(emergencyNumberSerializer).filter(present),
  };
}
