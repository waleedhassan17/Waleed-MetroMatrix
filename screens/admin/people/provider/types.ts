// What the provider screen reads from GET /api/admin/providers/:id. The
// generated ProviderDetail covers the contract fields; the profile fields
// below are passed through from the Provider document as-is.

import type { ProviderDetail } from '../../../../networks/admin/adminApi';

export type ProviderView = ProviderDetail & {
  rejectedAt?: string | null;
  address?: string | null;
  experience?: number | null;
  briefDescription?: string | null;
  rate?: number | null;
  consultationFee?: number | null;
  professionalName?: string | null;
  businessName?: string | null;
  specialty?: string | null;
  profession?: string | null;
  category?: string | null;
  documents?: Record<string, { name?: string; url?: string; uploadedAt?: string; verified?: boolean } | undefined>;
  adminNotes?: string | null;
};

export type ProviderState = 'incomplete' | 'pending' | 'approved' | 'rejected' | 'suspended';
