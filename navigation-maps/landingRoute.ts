// ============================================================================
// Where a signed-in session resumes
//
// The intro hands every launch to RoleSelection, signed in or not — the user
// asked for RoleSelection after onboarding without exception. A session is not
// thrown away for that: when the role picked on RoleSelection matches the
// stored session, `resumeRouteFor` sends it to its home instead of asking for
// credentials again. The history below is why this lives in its own file.
//
// WHY THIS IS NOT IN appContainer.tsx ANY MORE
// --------------------------------------------
// Splash and Onboarding used to be a gate: AppContainer sent the very first
// launch to Splash and every launch after that straight past it, because
// Onboarding persists `onboardingComplete` and a stored `selectedRole` then
// sent the launch on to SignIn. That made the intro unreachable after run one
// — the app opened on SignIn — with no way to see it again short of clearing
// app storage.
//
// The intro is now an unconditional prologue: every launch starts at Splash,
// plays Onboarding, and *then* asks this function where the session actually
// belongs. Onboarding is the caller, so the decision has to live somewhere both
// it and AppContainer can import — and it cannot live in navigation-maps/Base,
// which imports Onboarding itself and would close the cycle.
//
// Route names are the same string literals `BaseRouteNames` holds; they are
// repeated here rather than imported for exactly that reason, and the union
// type is what keeps the two in step.
// ============================================================================

export type LandingRoute =
  | 'RoleSelection'
  | 'UserHome'
  | 'HomeServiceProviderDashboard'
  | 'DoctorStack'
  | 'AdminHome';

export interface LandingState {
  userType: 'user' | 'provider' | 'admin' | null;
  /** Truthy once `fetchMe` has resolved a session for the stored token. */
  hasUser: boolean;
  hasProvider: boolean;
  /** `providerType` on the signed-in provider — doctors get their own stack. */
  providerType?: string | null;
}

/**
 * The post-intro destination.
 *
 * A signed-in session resumes where it left off: replaying the intro is not a
 * sign-out, and making someone re-authenticate every launch to watch a splash
 * animation would be a worse bug than the one this replaces.
 *
 * Everyone else lands on RoleSelection. A role left over from a previous run
 * deliberately does NOT shortcut to that role's sign-in — with the intro
 * replaying on every launch, the stored role is stale by construction, and
 * honouring it is exactly what used to drop people on SignIn without ever
 * asking.
 */
export const resolveLandingRoute = ({
  userType,
  hasUser,
  hasProvider,
  providerType,
}: LandingState): LandingRoute => {
  // An admin resumes in the console. AdminGate verifies the stored session on
  // the way in and sends a dead one to SignIn, so nothing is checked here.
  if (userType === 'admin') return 'AdminHome';
  if (userType === 'provider' && hasProvider) {
    return providerType === 'doctor' ? 'DoctorStack' : 'HomeServiceProviderDashboard';
  }
  if (userType === 'user' && hasUser) return 'UserHome';
  return 'RoleSelection';
};

/**
 * Where a role picked on RoleSelection should go when a session is already
 * stored for it, or null to carry on to that role's sign-in.
 *
 * "User" is also the admin's door — the admin console signs in through the
 * customer SignIn — so a stored admin session resumes from it, and AdminGate
 * still verifies that session on the way in. A session for the OTHER role does
 * not resume: a signed-in customer who picks "Service provider" is asking for
 * the provider sign-in.
 */
export const resumeRouteFor = (
  role: 'user' | 'provider',
  state: LandingState,
): Exclude<LandingRoute, 'RoleSelection'> | null => {
  const landing = resolveLandingRoute(state);
  if (role === 'user' && (landing === 'UserHome' || landing === 'AdminHome')) return landing;
  if (role === 'provider' && (landing === 'HomeServiceProviderDashboard' || landing === 'DoctorStack')) {
    return landing;
  }
  return null;
};
