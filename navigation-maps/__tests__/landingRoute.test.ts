import { LandingState, resumeRouteFor } from '../landingRoute';

// Every launch now reaches RoleSelection, signed in or not, so this is the
// whole difference between "resume" and "sign in again".

const visitor: LandingState = { userType: null, hasUser: false, hasProvider: false };
const customer: LandingState = { userType: 'user', hasUser: true, hasProvider: false };
const admin: LandingState = { userType: 'admin', hasUser: false, hasProvider: false };
const tradesperson: LandingState = {
  userType: 'provider',
  hasUser: false,
  hasProvider: true,
  providerType: 'home_service',
};
const doctor: LandingState = { ...tradesperson, providerType: 'doctor' };

it('a visitor carries on to sign-in through either door', () => {
  expect(resumeRouteFor('user', visitor)).toBeNull();
  expect(resumeRouteFor('provider', visitor)).toBeNull();
});

it('a signed-in customer picking User resumes their home', () => {
  expect(resumeRouteFor('user', customer)).toBe('UserHome');
});

it('the admin console resumes through the User door, which is where admins sign in', () => {
  expect(resumeRouteFor('user', admin)).toBe('AdminHome');
});

it('a signed-in provider picking Service provider resumes their own dashboard', () => {
  expect(resumeRouteFor('provider', tradesperson)).toBe('HomeServiceProviderDashboard');
  expect(resumeRouteFor('provider', doctor)).toBe('DoctorStack');
});

it('picking the OTHER role asks for that role’s sign-in instead of resuming', () => {
  expect(resumeRouteFor('provider', customer)).toBeNull();
  expect(resumeRouteFor('provider', admin)).toBeNull();
  expect(resumeRouteFor('user', tradesperson)).toBeNull();
});

it('a stored role whose session did not load is not a session', () => {
  expect(resumeRouteFor('user', { ...customer, hasUser: false })).toBeNull();
  expect(resumeRouteFor('provider', { ...tradesperson, hasProvider: false })).toBeNull();
});
