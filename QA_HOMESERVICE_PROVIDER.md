# QA_HOMESERVICE_PROVIDER — Home Services, provider flows

Run 2026-09-26, same environment and harness as `QA_HOMESERVICE_CUSTOMER.md`: live demo backend, live realtime
service (release v19), seeded accounts `provider1..15.hs@metromatrix.pk` opposite `customer1..8.hs@metromatrix.pk`,
driven by `MetroMatrix-Backend/scripts/e2e-homeservice.js` with a real socket per role.

**Result: 117/117 checks pass on production.**

| Flow | Checks | Result |
|---|---|---|
| New request arrives live (socket + push), accept / decline | S1, S3, S5 | pass |
| Trip — start, live location to the customer, arrive | S1 | pass |
| Work — start, complete with final amount, bounds | S1, S10 | pass |
| Getting paid — wallet, request payment, confirm cash, commission | S1, S2 | pass |
| Customer cancels / confirms early | S4, S6 | 15 pass |
| Earnings, payouts | S1, S11 | pass |
| Working hours, days off | S12 | pass |
| Other providers' jobs, races, double taps | S8, S9 | 13 pass |

---

## Bugs found and fixed

### P0 — Confirming a cash payment always failed

**Expected.** The provider taps "Cash received"; the job is paid and the 10% commission is recorded.
**Actual.** HTTP 400 every time the provider's wallet could cover the commission.
**Cause.** The commission leg (provider → Platform) wrote a `WalletTransaction` whose counterparty type was
`Platform`, which the model's enum did not allow; the validation error aborted the whole settlement.
**Fix.** `Platform` is an allowed counterparty. Settlement also takes an atomic claim on the booking first, so a
customer's wallet payment and a cash confirmation arriving together can no longer settle one job twice, and the
cash commission is idempotent per booking.
**Verified.** S2: cash confirmed, the customer's screen hears it live, wallet untouched, commission debited once;
confirming twice refused. S9: wallet ×2 plus cash confirm at once — exactly one settles.

### P0 — Providers could never withdraw

**Actual.** The Earnings "Available" card and the payout form showed, and checked against, the total of PENDING
payouts (usually Rs. 0), so every payout request was refused on the phone. The payout modal was also declared
inside the screen, so each keystroke remounted it and closed the keyboard.
**Fix.** Available balance and minimum payout come from the server (wallet minus unpaid cash commissions minus
pending payouts); the modal renders inline.
**Verified.** S11: below-minimum and over-balance refused; a valid request accepted and the available balance
drops by exactly its amount.

### P0 — Final amount unchecked, and rewritable after payment

**Fix.** Must be a positive whole-rupee amount within the job's ceiling; locked once paid. A `0` (what installed
app builds send when no amount is typed) means "bill the estimate", as it always did.
**Verified.** S10: −500, "abc" and 10,000,000 refused; price change after payment → 409.

### P1 — Live location froze after "Start job"

**Actual.** The realtime service cached each room's booking status for 60 s, so a provider who had joined the room
earlier had every position dropped as "not trackable" for up to a minute after setting off — and kept being relayed
for up to a minute after work started.
**Fix.** A status change clears the room's cached access, and the last position is forgotten once tracking ends.
**Verified.** The same check failed against the old realtime service (`broadcast:false, reason:status`) and passes
against release v19; S1 also confirms nothing is relayed once work starts.

### P1 — Tapping "New booking request" did nothing; notifications switch did nothing

**Fix.** Job pushes open the job (loaded fresh) or, for money, the payment screen. The Settings switch now really
unregisters / re-registers this phone and survives sign-in. Providers are also pushed when a customer cancels,
confirms completion, pays, or chooses cash.

### P1 — Requests from July clogged the queue

**Fix.** Expiry (see the customer report). provider3.hs had 21 dead requests; the queue now shows only live work,
ordered: in progress, awaiting your answer, today, upcoming — then history.

### P1 — Earnings controls that did nothing

**Fix.** The W/M/Y chips and period filter fetch that period (the server ignored `period` before); the chart shows the
last 7 days / 6 months / 12 months; "Download" shares a CSV statement; disabled "Details", "View All" and "Language ·
coming soon" controls are gone; on-time and repeat-customer rates are computed from real jobs (they were a
placeholder and 0) and read "—" with no track record.

### P1 — Dashboard jobs opened at the city centre

**Actual.** Jobs opened from the dashboard used a hardcoded central-Lahore position, so the job map and
navigation pointed there instead of the customer. Every performance tile also drew a rising arrow.
**Fix.** Dashboard jobs carry the customer's address and coordinates; a figure with nothing to compare against
draws no arrow. Completion rate now counts only the provider's own outcomes (declines, no-shows), not customer
cancellations or requests released to another provider.

### P1 — Working hours could not be set

**Fix.** Availability gains a weekly hours editor; booking offers only those hours and days (server-enforced).

### P2 — Also fixed
- Accept racing a cancel / double taps: conditional writes (S9: two simultaneous accepts record one acceptance).
- "Today" and earnings months use Pakistan time, not the server's UTC day.
- A customer-confirmed completion now counts towards the provider's completed jobs (S6).
- Rate limiting is per account, so the awaiting-approval screen's 6-second polling can no longer lock a provider out.

---

## Not done / known limits

- **On-device walkthrough: not yet run** — the phone disconnected from USB. All flows are proven through the real
  API and realtime service; the changed screens compile into the Android bundle but have not been tapped through
  on a device.
- `CRON_SECRET` was missing from Vercel, so the healthcare slot-refresh cron had been refused (401) daily. It is set
  now, which also turns that cron on.
- Pre-existing wallet/ledger mismatches in 24 wallets from other modules — see the customer report.
