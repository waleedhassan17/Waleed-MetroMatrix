// ============================================
// USER HOME NETWORK APIs
// ============================================

import { ApiResponse } from '../../models/serviceProviders';
import { apiRequest, USE_DUMMY_DATA } from './config';

export interface ServiceCategory {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  image: string;
  providerCount: string;
  providers: string[];
  icon: string;
}

export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  discount: string;
  badge: string;
  gradient: string[];
  cta: string;
  icon?: string;
}

export interface HomeData {
  categories: ServiceCategory[];
  promotions: Promotion[];
}

const DUMMY_HOME_CATEGORIES: ServiceCategory[] = [
  {
    id: 'electricians',
    name: 'Electricians',
    badge: 'ELECTRICAL',
    badgeColor: '#F59E0B',
    description: 'Professional electrical services for all your wiring and installation needs',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
    providerCount: '150+ Experts',
    providers: [
      'https://i.pravatar.cc/100?img=1',
      'https://i.pravatar.cc/100?img=2',
      'https://i.pravatar.cc/100?img=3',
    ],
    icon: 'flash-outline',
  },
  {
    id: 'plumbers',
    name: 'Plumbers',
    badge: 'PLUMBING',
    badgeColor: '#3B82F6',
    description: 'Expert plumbing solutions for repairs, installations and maintenance',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
    providerCount: '100+ Experts',
    providers: [
      'https://i.pravatar.cc/100?img=10',
      'https://i.pravatar.cc/100?img=11',
      'https://i.pravatar.cc/100?img=12',
    ],
    icon: 'water-outline',
  },
  {
    id: 'ac-repairers',
    name: 'AC Repairers',
    badge: 'AC REPAIR',
    badgeColor: '#06B6D4',
    description: 'AC installation, repair and maintenance by certified technicians',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
    providerCount: '80+ Experts',
    providers: [
      'https://i.pravatar.cc/100?img=20',
      'https://i.pravatar.cc/100?img=21',
      'https://i.pravatar.cc/100?img=22',
    ],
    icon: 'snow-outline',
  },
];

const DUMMY_PROMOTIONS: Promotion[] = [
  {
    id: 'promo-1',
    title: 'First Service Free',
    subtitle: 'Get 30% off on your first home service booking',
    discount: '30% OFF',
    badge: '🎉 NEW USER',
    gradient: ['#10B981', '#059669'],
    cta: 'Claim Now',
    icon: '🏠',
  },
  {
    id: 'promo-2',
    title: 'Weekend Special',
    subtitle: 'Book any service this weekend and save big',
    discount: '40% OFF',
    badge: '⚡ LIMITED',
    gradient: ['#8B5CF6', '#6D28D9'],
    cta: 'Book Now',
    icon: '🔧',
  },
];

export async function fetchHomeData(): Promise<ApiResponse<HomeData>> {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      success: true,
      data: {
        categories: DUMMY_HOME_CATEGORIES,
        promotions: DUMMY_PROMOTIONS,
      },
      message: 'Home data fetched',
    };
  }

  return apiRequest<HomeData>('/user/home');
}
