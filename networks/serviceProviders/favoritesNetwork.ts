// ============================================
// FAVORITES (WISHLIST) NETWORK APIs
//
// Backs the heart on a provider profile and the Favorites list. Every endpoint
// returns the caller's FULL favourites list so the client can replace its
// state rather than reconcile a diff — which is what lets the heart update
// optimistically and roll back cleanly on failure.
// ============================================

import { Provider, ApiResponse } from '../../models/serviceProviders';
import { apiRequest } from './config';

/** A favourited provider carries the standard provider card plus when it was saved. */
export interface FavoriteProvider extends Provider {
  favoritedAt?: string;
}

export async function fetchFavorites(): Promise<ApiResponse<FavoriteProvider[]>> {
  return apiRequest<FavoriteProvider[]>('/user/favorites');
}

export async function addFavorite(
  providerId: string
): Promise<ApiResponse<FavoriteProvider[]>> {
  return apiRequest<FavoriteProvider[]>(`/user/favorites/${providerId}`, {
    method: 'POST',
  });
}

export async function removeFavorite(
  providerId: string
): Promise<ApiResponse<FavoriteProvider[]>> {
  return apiRequest<FavoriteProvider[]>(`/user/favorites/${providerId}`, {
    method: 'DELETE',
  });
}
