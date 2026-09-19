// ============================================
// Healthcare — Health record actions
// Shared by the health-records list and the
// record-detail screen so a record behaves the
// same wherever it is rendered.
// ============================================

import { Alert, Share } from 'react-native';
import type { MedicalRecord } from '../../models/healthcare/types';
import { downloadPublicFile, mimeTypeForUrl, saveOrShareFile } from './documents';
import { getRecordFileExtension } from './recordDisplay';

/** The filename a saved record should carry, derived from its title. */
function fileNameFor(record: MedicalRecord): string {
  const ext = getRecordFileExtension(record);
  const base = (record.title || 'health-record').trim();
  return ext ? `${base}.${ext}` : base;
}

/**
 * Send the record on as a link.
 *
 * The file itself lives on Cloudinary behind a public URL, so a link is what
 * the recipient can actually open — attaching the bytes would force whoever
 * receives it to have a PDF reader to hand.
 */
export async function shareRecord(record: MedicalRecord | null | undefined): Promise<void> {
  if (!record) return;
  try {
    await Share.share({
      title: record.title,
      message: record.fileUrl ? `${record.title}\n${record.fileUrl}` : record.title,
    });
  } catch {
    // User dismissed the sheet — nothing to report.
  }
}

/**
 * Save the record's file to the device.
 *
 * Records are user uploads and may be PDF, JPEG or PNG, so the content type is
 * read off the URL rather than assumed — a mislabelled file opens in nothing.
 */
export async function downloadRecord(record: MedicalRecord | null | undefined): Promise<void> {
  if (!record?.fileUrl) {
    Alert.alert('Nothing to download', 'This record has no attached file.');
    return;
  }
  try {
    const uri = await downloadPublicFile(record.fileUrl, fileNameFor(record));
    await saveOrShareFile(uri, {
      mimeType: mimeTypeForUrl(record.fileUrl),
      dialogTitle: `Save ${record.title}`,
    });
  } catch (e: any) {
    Alert.alert('Download failed', e?.message || 'This file could not be downloaded.');
  }
}
