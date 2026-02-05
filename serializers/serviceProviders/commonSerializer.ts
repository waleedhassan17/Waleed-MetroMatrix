// ============================================
// COMMON SERIALIZERS
// ============================================

import { Pagination } from '../../models/serviceProviders';

export function paginationSerializer(data: any): Pagination {
  return {
    currentPage: data?.currentPage || data?.page || 1,
    totalPages: data?.totalPages || 1,
    totalItems: data?.totalItems || data?.total || 0,
    itemsPerPage: data?.itemsPerPage || data?.limit || 15,
    hasNext: data?.hasNext ?? (data?.currentPage < data?.totalPages),
    hasPrevious: data?.hasPrevious ?? (data?.currentPage > 1),
  };
}
