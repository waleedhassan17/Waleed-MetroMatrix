# Phase F3 — Navigation and design foundation

Branch `admin-hardening`. The `admin` theme module and the `components/admin`
kit landed early, in F2; this phase builds the console's structure on them.

## Navigation

- **`AdminHome` → `navigators/AdminTabs.tsx`: Overview · Queue · People ·
  Modules · More.**
  - People appears only with a people permission (providers, users or admins).
  - Modules appears only with a module permission.
  - More carries the unread-notification badge, polled every 60 s while the
    console is open.
  - `AdminHome` is the landing route after sign-in and on relaunch
    (`landingAfterSignIn`, `landingRoute.ts`).
- **New routes, all behind `AdminGate` and themed `admin`:**

  | Route | Screen |
  |---|---|
  | `AdminNotifications` | Per-admin read state, unread filter, mark-all-read, dismiss, clear (with `canManageNotifications`); a tap deep-links to the target (`notificationTarget.ts`) |
  | `AdminSettings` | Rendered entirely from the server `spec`: only enforced settings, per-section save, server field errors inline, discard prompt when leaving with changes, read-only sections explained |
  | `AdminProfile` | Name and sign-in email (email change needs the current password), effective permissions, change password, two-factor on/off, signed-in devices with sign-out (signing out the current one signs you out) |
  | `AdminManagement` / `AdminDetail` | List admins (role, 2FA, last sign-in, disabled). Super admins add admins (temporary password shown once), edit role and permissions from the meta presets, disable/enable with a reason, reset password or two-factor, sign out an admin's devices. The server's rules (not yourself, not the last super admin) come back as messages. |

- **Modules hub:** Home services (Payout requests only with Finance),
  Healthcare (the hub, `AdminHealthcareDashboard`, rewritten in F2) and
  Shopping. Full names throughout, no "HS".
- **More:** who is signed in, notifications, platform settings, admins
  (`canManageAdmins`), profile and security, sign out / sign out everywhere
  (`useAdminSignOut`, which also clears the console's cached data).
- **Deleted:**
  - `screens/admin/provider-review/providerReviewScreen.tsx` (never registered)
    and the duplicate `ProviderReview` route.
  - The legacy `notification.tsx` / `settings.tsx` screens and their slices.
    Neither was reachable; the settings screen offered controls nothing read.

## Reachability test

`screens/admin/__tests__/reachability.test.ts` reads the navigation maps and
every admin source file:

1. Every route the admin code opens is registered.
2. Every route in `AdminRoutes` has an inbound edge: a navigation call, a route
   object, a tab, or the landing route.

Before this phase, five healthcare screens, notifications and settings were
unreachable. Transitional allow-lists are named in the test, cover only code
that F4 deletes or lands, and are removed there.

The inventory's reachability column now understands tab roots, stack initial
routes and route-constant references: 43 of 43 registered screens are
reachable.

## Numbers

| | F2 | F3 |
|---|---|---|
| Admin screens using the kit | 9 | 16 |
| Hex literals in admin code | 1,166 | 935 |
| `Alert.alert` in admin code | 95 | 79 |
| no-static-data hits | 62 | 49 (legacy dashboard, provider/user management, HS screens) |
| jest | 10 suites / 232 | 12 suites / 242 |

## Deviations

- **For this commit, the Overview, Queue and People tabs render the legacy
  dashboard, pending-review and user-management screens.** F4 waves 1–2
  replace them. Each commit stays working.
- **No QR code for two-factor enrolment.** It would need a new native
  dependency; enrolment uses the `otpauth://` link plus a typeable key.
