import assert from "node:assert/strict";
import test from "node:test";

import {
  isPushRegistrationStale,
  PUSH_REGISTRATION_REFRESH_INTERVAL_MS,
} from "../utils/push/registrationPolicy";

const NOW = Date.parse("2026-09-28T00:00:00.000Z");

test("push registration is refreshed before the backend 30-day health cutoff", () => {
  const sevenDaysAgo = new Date(
    NOW - PUSH_REGISTRATION_REFRESH_INTERVAL_MS
  ).toISOString();

  assert.equal(isPushRegistrationStale(sevenDaysAgo, NOW), true);
});

test("recent push registration remains a no-op", () => {
  const sixDaysAgo = new Date(
    NOW - PUSH_REGISTRATION_REFRESH_INTERVAL_MS + 24 * 60 * 60 * 1000
  ).toISOString();

  assert.equal(isPushRegistrationStale(sixDaysAgo, NOW), false);
});

test("missing or malformed push registration timestamps are refreshed", () => {
  assert.equal(isPushRegistrationStale(null, NOW), true);
  assert.equal(isPushRegistrationStale("not-a-date", NOW), true);
});
