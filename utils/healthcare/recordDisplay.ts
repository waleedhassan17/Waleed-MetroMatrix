// ============================================
// Healthcare — Health record display helpers
// Shared by the health-records list and the
// record-detail screen so a record looks the
// same wherever it is rendered.
// ============================================

import type { MedicalRecord } from '../../models/healthcare/types';

export interface RecordTypeConfig {
  icon: string;
  color: string;
  label: string;
}

export const RECORD_TYPE_CONFIG: Record<string, RecordTypeConfig> = {
  prescription: { icon: 'prescription', color: '#2A7FFF', label: 'Prescription' },
  report: { icon: 'flask-outline', color: '#10B981', label: 'Lab Report' },
  imaging: { icon: 'image-filter-center-focus', color: '#5A9FFF', label: 'Imaging' },
  discharge: { icon: 'clipboard-check-outline', color: '#F59E0B', label: 'Discharge' },
  vaccination: { icon: 'needle', color: '#2A7FFF', label: 'Vaccination' },
  other: { icon: 'folder-open-outline', color: '#6B7280', label: 'Other' },
};

export const getRecordConfig = (type: string): RecordTypeConfig =>
  RECORD_TYPE_CONFIG[type] ?? RECORD_TYPE_CONFIG.other;

/** "12 March 2026, 4:30 PM" — empty string when the date is unusable. */
export function formatRecordDate(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Lowercased file extension from a record's URL, e.g. "pdf". */
export function getRecordFileExtension(record?: MedicalRecord | null): string {
  const url = record?.fileUrl || '';
  const withoutQuery = url.split('?')[0];
  const match = withoutQuery.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
}

/** True when the attachment can be shown inline with <Image>. */
export function isImageRecord(record?: MedicalRecord | null): boolean {
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic'].includes(
    getRecordFileExtension(record)
  );
}
