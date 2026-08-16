// ============================================
// Shopping — Address form validation
// Single source of truth for what a shipping
// address must contain, shared by the checkout
// address form and the address-selection sheet.
// ============================================

import { z } from 'zod';

/**
 * The backend requires exactly these four fields
 * (`addressController.js` createAddress, and `checkoutService.js` at order
 * time): fullName, phone, addressLine1, city. `area`, `state`, `postalCode`
 * and `landmark` are optional server-side and default to ''.
 *
 * The old client check required `area` — stricter than the server — and used
 * bare truthiness, so a single space passed validation and was stored.
 */
const requiredText = (label: string, min = 2) =>
  z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, { message: `${label} is required` })
    .refine((v) => v.length >= min, {
      message: `${label} must be at least ${min} characters`,
    });

/** Matches the pattern already used by the sign-up screens. */
const PHONE_RE = /^[0-9]{10,15}$/;

export const AddressFormSchema = z.object({
  name: requiredText('Full name'),
  phone: z
    .string()
    .transform((v) => v.trim().replace(/[\s-]/g, ''))
    .refine((v) => v.length > 0, { message: 'Phone number is required' })
    .refine((v) => PHONE_RE.test(v), {
      message: 'Enter a valid phone number (10-15 digits)',
    }),
  address: requiredText('Street address', 5),
  city: requiredText('City'),
  // Optional server-side — kept in the schema so the form type stays whole.
  area: z.string().optional(),
  landmark: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export type AddressFormValues = z.infer<typeof AddressFormSchema>;

/** Field name -> message, for inline errors under each input. */
export type AddressFormErrors = Partial<
  Record<'name' | 'phone' | 'address' | 'city', string>
>;

export interface AddressValidationResult {
  valid: boolean;
  errors: AddressFormErrors;
}

/**
 * Validates an address form. Returns per-field messages rather than throwing,
 * so the screen can mark the offending inputs instead of firing one alert for
 * whichever field happened to fail first.
 */
export function validateAddressForm(form: unknown): AddressValidationResult {
  const parsed = AddressFormSchema.safeParse(form);
  if (parsed.success) return { valid: true, errors: {} };

  const errors: AddressFormErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof AddressFormErrors;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { valid: false, errors };
}

/** True when the user has typed anything into the new-address form. */
export function hasAddressInput(form: {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  area?: string;
  landmark?: string;
  state?: string;
  postalCode?: string;
}): boolean {
  return [
    form.name,
    form.phone,
    form.address,
    form.city,
    form.area,
    form.landmark,
    form.state,
    form.postalCode,
  ].some((v) => typeof v === 'string' && v.trim().length > 0);
}
