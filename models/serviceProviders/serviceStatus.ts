// ============================================
// SERVICE STATUS MODELS
// ============================================

export interface ServiceProvider {
  id: string;
  name: string;
  phone: string;
  image: string;
  // Credentials for the provider card. These arrive unpadded: an unrated or
  // unprofiled provider yields 0 / '' and the card hides the badge instead of
  // rendering "★ 0" or an empty pill.
  rating: number;
  reviews: number;
  experience: string;
  specialty: string;
  verified: boolean;
}

export interface ServiceDetails {
  type: string;
  description: string;
  startedAt: string;
  estimatedDuration: string;
  suggestedAmount: number;
}

export interface ProgressStep {
  id: number;
  label: string;
  completed: boolean;
  /**
   * Pre-formatted by the server in Asia/Karachi. Kept only as a fallback for
   * the deploy window where the app is newer than the API — prefer `timeAt`.
   */
  time?: string;
  /** The instant this step was reached, ISO. Format it locally. */
  timeAt?: string;
}

// Payment runs AFTER completion, so it is a parallel field rather than a
// booking status (HOMESERVICE_SPEC.md §2). The service-status screen needs it
// to decide whether the payment card is still owed — that decision has to come
// from the server, not from screen-local state that resets on focus.
export interface ServicePayment {
  status: 'unpaid' | 'requested' | 'paid';
  method: string | null;
  amount: number;
  paidAt: string | null;
}

export interface ServiceStatus {
  bookingId: string;
  status: 'arrived' | 'in_progress' | 'completed';
  /**
   * The raw lifecycle status from the server. `status` above collapses
   * everything before IN_PROGRESS into 'arrived', so it cannot answer "has the
   * work actually started?" — which is what decides whether the customer may
   * confirm completion. Optional: an older server omits it.
   */
  canonicalStatus?: string;
  provider: ServiceProvider;
  serviceDetails: ServiceDetails;
  progressSteps: ProgressStep[];
  payment: ServicePayment;
}
