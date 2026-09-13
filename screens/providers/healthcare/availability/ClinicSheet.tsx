import React, { useEffect, useState } from 'react';

import { Button, FormSheet, TextField, showToast } from '../../../../components/ui';
import type { HubClinic } from '../../../../models/healthcare/doctorHub';
import { createDoctorClinic } from '../../../../networks/healthcare/doctorHubApi';

/**
 * Add a clinic without leaving the weekly-hours editor.
 *
 * In-clinic hours need a clinic, and the old availability screen could not add
 * one: its alert told the doctor to go to Manage Slots, and coming back threw
 * away the hours they had been editing.
 */
interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (clinic: HubClinic) => void;
}

interface Form {
  name: string;
  address: string;
  city: string;
  area: string;
  phone: string;
}

const EMPTY: Form = { name: '', address: '', city: '', area: '', phone: '' };

const ClinicSheet: React.FC<Props> = ({ visible, onClose, onSaved }) => {
  const [form, setForm] = useState<Form>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(EMPTY);
      setSubmitted(false);
    }
  }, [visible]);

  const errors: Partial<Record<keyof Form, string>> = {};
  if (!form.name.trim()) errors.name = 'Enter the clinic name';
  if (!form.address.trim()) errors.address = 'Enter the address patients should come to';
  if (!form.city.trim()) errors.city = 'Enter the city';
  const shown = submitted ? errors : {};

  const set = (key: keyof Form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    setSaving(true);
    const res = await createDoctorClinic({
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      area: form.area.trim() || undefined,
      phone: form.phone.trim() || undefined,
    });
    setSaving(false);
    if (!res.success) {
      showToast({ message: res.message || "We couldn't add this clinic", tone: 'error' });
      return;
    }
    showToast({ message: `${res.data.name} added`, tone: 'success' });
    onSaved(res.data);
    onClose();
  };

  return (
    <FormSheet
      visible={visible}
      title="Add a clinic"
      subtitle="Patients booking in-clinic visits see this address."
      onClose={onClose}
      busy={saving}
      footer={<Button label="Add clinic" onPress={save} loading={saving} />}
    >
      <TextField label="Clinic name" value={form.name} onChangeText={set('name')} error={shown.name} maxLength={80} />
      <TextField label="Address" value={form.address} onChangeText={set('address')} error={shown.address} maxLength={200} />
      <TextField label="City" value={form.city} onChangeText={set('city')} error={shown.city} maxLength={60} />
      <TextField label="Area (optional)" value={form.area} onChangeText={set('area')} maxLength={60} />
      <TextField
        label="Phone (optional)"
        value={form.phone}
        onChangeText={set('phone')}
        keyboardType="phone-pad"
        maxLength={20}
      />
    </FormSheet>
  );
};

export default ClinicSheet;
