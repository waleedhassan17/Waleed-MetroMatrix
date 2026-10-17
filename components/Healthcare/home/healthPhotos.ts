// The Health home's bundled photos: the "How can we help you today?" cards
// and the service tiles. Free under the Unsplash License; each photo's page
// and photographer are in assets/images/healthcare/CREDITS.md.

import type { ImageSourcePropType } from 'react-native';
import type { PhotoFocus } from './FocusImage';

export const HEALTH_PHOTOS = {
  video: require('../../../assets/images/healthcare/video.jpg'),
  clinic: require('../../../assets/images/healthcare/clinic.jpg'),
  available: require('../../../assets/images/healthcare/available.jpg'),
  specialties: require('../../../assets/images/healthcare/specialties.jpg'),
  records: require('../../../assets/images/healthcare/records.jpg'),
  prescriptions: require('../../../assets/images/healthcare/prescriptions.jpg'),
  symptoms: require('../../../assets/images/healthcare/symptoms.jpg'),
  vitals: require('../../../assets/images/healthcare/vitals.jpg'),
  emergency: require('../../../assets/images/healthcare/emergency.jpg'),
} satisfies Record<string, ImageSourcePropType>;

export type HealthPhoto = keyof typeof HEALTH_PHOTOS;

/**
 * Where each photo's subject is (its file's aspect, and the point to keep in
 * view), so a small or tall card shows the doctor, not the bookshelf.
 */
export const PHOTO_FOCUS: Record<HealthPhoto, PhotoFocus> = {
  video: { aspect: 800 / 450, x: 0.62, y: 0.55 },
  clinic: { aspect: 800 / 522, x: 0.38, y: 0.3 },
  available: { aspect: 800 / 600, x: 0.45, y: 0.3 },
  specialties: { aspect: 800 / 529, x: 0.5, y: 0.4 },
  records: { aspect: 800 / 450, x: 0.5, y: 0.5 },
  prescriptions: { aspect: 800 / 600, x: 0.5, y: 0.5 },
  symptoms: { aspect: 800 / 450, x: 0.5, y: 0.4 },
  vitals: { aspect: 800 / 600, x: 0.6, y: 0.45 },
  emergency: { aspect: 800 / 533, x: 0.5, y: 0.5 },
};
