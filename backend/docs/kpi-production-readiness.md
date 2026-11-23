# KPI bot release verification — 23 November 2026

## Verified behavior

- The existing delayed-transcript, stale batch response, and shared group
  extraction lease fixes are present in this checkout.
- Acceptance now commits the recommendation decision and draft KPI in one
  transaction. Tests cover write failure, failure after the draft write,
  concurrent acceptance, acceptance racing dismissal, and committed audit
  records. Aborted transactions leave the recommendation pending.
- Cancelled meetings cannot be claimed for extraction.
- A malformed top-level goals response fails and retries instead of being
  saved as an empty successful result.
- A worker that loses its check-in lease stops before saving recommendations.

## Checks performed

- Root `npm test`: 47 shared, 2 frontend, and 391 backend tests passed.
- Root `npm run lint` and `npm run build`: passed. The production build
  retains its bundle-size warning.
- Temporary portal API flow: admin sign-in, enable bot, extract sample
  transcript, obtain three recommendations, accept a personal and a shared
  recommendation, then sign in as the founder and verify both draft KPIs.
  This flow uses the demo extractor, not live Gemini.
- Read-only checks on the configured database confirmed transaction support
  and found zero accepted recommendations without a corresponding KPI.
  No production records or settings were changed.

## Remaining rollout checks

- Live Gemini with synthetic meeting text was attempted twice using the
  configured model/key: the first request returned 503 UNAVAILABLE; the
  second reached its 90-second timeout. Live extraction was not verified.
  Automated tests cover timeout, retry, and outage recovery; these cannot
  establish availability or extraction quality for real meetings.
- Verify a transcription-enabled Google Meet through the production
  calendar connection, then confirm speaker attribution, supporting quote,
  target, deadline, and admin acceptance. This was not exercised here.
- Deploy against a transaction-capable MongoDB replica set or sharded
  cluster. Standalone MongoDB cannot accept recommendations atomically.
- These code changes need to be included in the release; this verification
  did not deploy them, run migrations, or alter production data.
