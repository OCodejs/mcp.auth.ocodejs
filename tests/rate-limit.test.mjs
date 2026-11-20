import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  consumeRateLimit,
  getTrustedClientIp
} from "../lib/rate-limit.ts";

function fakeStore() {
  const buckets = new Map();
  return {
    buckets,
    async $queryRaw(strings, ...values) {
      const [key, , now, expiresAt, windowStart, limit] = values;
      const current = buckets.get(key);
      if (!current || current.windowStartedAt <= windowStart) {
        buckets.set(key, { count: 1, windowStartedAt: now, expiresAt });
        return [{ allowed: true }];
      }
      if (current.count >= limit) return [];
      current.count += 1;
      current.expiresAt = expiresAt;
      return [{ allowed: current.count <= limit }];
    }
  };
}

test("rate-limit keys are HMAC digests and do not expose identifiers", async () => {
  const store = fakeStore();
  const email = "Person@example.com";
  await consumeRateLimit("login:identity", email, 2, 900, {
    client: store,
    secret: "test-secret-with-at-least-32-characters",
    now: new Date("2026-11-21T00:00:00.000Z")
  });
  const [key] = store.buckets.keys();
  const expected = createHmac("sha256", "test-secret-with-at-least-32-characters")
    .update("login:identity: person@example.com")
    .digest("hex");
  assert.equal(key, expected);
  assert.equal(key.includes(email), false);
});

test("rate-limit allows the configured count and denies the next request", async () => {
  const store = fakeStore();
  const options = {
    client: store,
    secret: "test-secret-with-at-least-32-characters",
    now: new Date("2026-11-21T00:00:00.000Z")
  };
  assert.equal((await consumeRateLimit("register", "a@example.com", 2, 900, options)).allowed, true);
  assert.equal((await consumeRateLimit("register", "a@example.com", 2, 900, options)).allowed, true);
  assert.equal((await consumeRateLimit("register", "a@example.com", 2, 900, options)).allowed, false);
});

test("rate-limit starts a new fixed window after the previous window expires", async () => {
  const store = fakeStore();
  const secret = "test-secret-with-at-least-32-characters";
  const identifier = "a@example.com";
  assert.equal((await consumeRateLimit("register", identifier, 1, 60, {
    client: store, secret, now: new Date("2026-11-21T00:00:00.000Z")
  })).allowed, true);
  assert.equal((await consumeRateLimit("register", identifier, 1, 60, {
    client: store, secret, now: new Date("2026-11-21T00:01:00.000Z")
  })).allowed, true);
});

test("trusted client IP is ignored unless the Cloudflare edge header is explicitly enabled", () => {
  const previous = process.env.AUTH_CLIENT_IP_HEADER;
  delete process.env.AUTH_CLIENT_IP_HEADER;
  assert.equal(getTrustedClientIp(new Request("https://example.test", {
    headers: { "cf-connecting-ip": "203.0.113.10" }
  })), null);
  process.env.AUTH_CLIENT_IP_HEADER = "cf-connecting-ip";
  assert.equal(getTrustedClientIp(new Request("https://example.test", {
    headers: { "cf-connecting-ip": "203.0.113.10" }
  })), "203.0.113.10");
  process.env.AUTH_CLIENT_IP_HEADER = "x-forwarded-for";
  assert.throws(() => getTrustedClientIp(new Request("https://example.test")), /trusted edge header/);
  if (previous === undefined) delete process.env.AUTH_CLIENT_IP_HEADER;
  else process.env.AUTH_CLIENT_IP_HEADER = previous;
});

test("invalid rate-limit policies and missing secrets fail closed", async () => {
  const store = fakeStore();
  await assert.rejects(
    consumeRateLimit("login", "a@example.com", 0, 60, {
      client: store, secret: "test-secret-with-at-least-32-characters"
    }),
    /Invalid rate-limit policy/
  );
  await assert.rejects(
    consumeRateLimit("login", "a@example.com", 1, 60, { client: store, secret: "short" }),
    /AUTH_SECRET/
  );
});
