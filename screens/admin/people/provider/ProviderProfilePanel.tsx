// ============================================================================
// A provider's profile: contact details, what they told us about their work,
// their account, and the documents they uploaded (with whether each has been
// verified). Missing values show "—".
// ============================================================================

import React, { useMemo } from 'react';
import { Linking, StyleSheet, Text } from 'react-native';

import { DetailRow, EntityRow, Section } from '../../../../components/admin';
import { formatMoney } from '../../../../constants/Currency';
import { formatCount, formatDate, formatDateTime, formatRating } from '../../../../utils/admin/format';
import { S, T, useTheme, type ThemeColors } from '../../../../theme';
import type { ProviderView } from './types';

// "medicalLicense" → "Medical license"
export const documentLabel = (key: string) => {
  const words = key.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// A national ID shown in full is more than the screen needs.
export const maskId = (id?: string | null) => (id ? `•••• ${id.replace(/\D/g, '').slice(-4)}` : null);

export default function ProviderProfilePanel({ p }: { p: ProviderView }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const documents = Object.entries(p.documents ?? {}).filter(([, d]) => d?.url);
  const counters = p.counters;

  return (
    <>
      <Section title="Contact" card>
        <DetailRow label="Email" value={p.email} />
        <DetailRow label="Email verified" value={p.emailVerified ? 'Yes' : 'No'} />
        <DetailRow label="Phone" value={p.phoneNumber} />
        <DetailRow label="Address" value={p.address} />
        <DetailRow label="ID number" value={maskId(p.idNumber)} last />
      </Section>

      <Section title="Work" card>
        <DetailRow label="Business name" value={p.businessName} />
        <DetailRow label="Professional name" value={p.professionalName} />
        <DetailRow label="Specialty or profession" value={p.specialty || p.profession || p.category} />
        <DetailRow label="Experience" value={p.experience === null || p.experience === undefined ? null : `${p.experience} year${p.experience === 1 ? '' : 's'}`} />
        <DetailRow
          label={p.consultationFee !== null && p.consultationFee !== undefined ? 'Consultation fee' : 'Rate'}
          value={p.consultationFee ?? p.rate ? formatMoney(p.consultationFee ?? p.rate) : null}
        />
        <DetailRow label="Rating" value={formatRating(p.rating?.average, p.rating?.count)} last={!p.briefDescription} />
        {!!p.briefDescription && <Text style={styles.description}>{p.briefDescription}</Text>}
      </Section>

      <Section title="Account" card>
        <DetailRow label="Signed up" value={formatDateTime(p.createdAt)} />
        <DetailRow label="Submitted for review" value={p.submittedAt ? formatDateTime(p.submittedAt) : null} />
        <DetailRow label="Approved" value={p.approvedAt ? formatDate(p.approvedAt) : null} />
        <DetailRow label="Last signed in" value={p.lastLoginDate ? formatDateTime(p.lastLoginDate) : null} />
        <DetailRow label="Taking work" value={p.isAvailable === null || p.isAvailable === undefined ? null : p.isAvailable ? 'Yes' : 'No'} />
        <DetailRow
          label="Jobs (recorded on the account)"
          value={
            typeof counters?.completedBookings === 'number' && typeof counters?.totalBookings === 'number'
              ? `${formatCount(counters.completedBookings)} completed of ${formatCount(counters.totalBookings)}`
              : null
          }
          last
        />
      </Section>

      <Section title="Documents" count={documents.length || null} caption={documents.length ? undefined : 'Nothing uploaded.'} card={documents.length > 0}>
        {documents.map(([key, d], i) => (
          <EntityRow
            key={key}
            title={documentLabel(key)}
            subtitle={d?.uploadedAt ? `Uploaded ${formatDate(d.uploadedAt)}` : d?.name ?? null}
            icon="document-text-outline"
            badge={d?.verified ? { label: 'Verified', tone: 'success' } : { label: 'Not verified', tone: 'neutral' }}
            onPress={() => d?.url && Linking.openURL(d.url)}
            accessibilityLabel={`${documentLabel(key)}, ${d?.verified ? 'verified' : 'not verified'}. Opens the file.`}
            divider={i < documents.length - 1}
          />
        ))}
      </Section>
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    description: { ...T.body, color: c.ink, paddingVertical: S.md },
  });
