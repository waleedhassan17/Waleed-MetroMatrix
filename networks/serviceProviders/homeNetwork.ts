// ============================================
// USER HOME NETWORK APIs
// ============================================

import { ApiResponse } from '../../models/serviceProviders';
import { apiRequest } from './config';

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

export async function fetchHomeData(): Promise<ApiResponse<HomeData>> {
    return apiRequest<HomeData>('/user/home');
}
