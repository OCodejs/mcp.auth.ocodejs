import assert from "node:assert/strict";
import test from "node:test";
import { consumeRateLimit, getTrustedClientIp } from "../lib/rate-limit.ts";

test("rate-limit key is not sent as plaintext identifier", async () => {
  let received;
  const client = {
    async $queryRaw(strings, ...values) {
      received = { sql: strings.join("?"), values };
      return [{ allowed: true }];
    }
  };
  const result = await consumeRateLimit("login:identity", "person@example.com", 10, 900, {
    client,
    secret: "a".repeat(48),
    now: new Date("2026-11-20T00:00:00.000Z")
  });

  assert.equal(result.allowed, true);
  assert.equal(received.values[0].length, 64);
  assert.equal(received.values.includes("person@example.com"), false);
  assert.match(received.sql, /ON CONFLICT/);
  assert.match(received.sql, /RETURNING/);
});

test("a missing returned row means the atomic database limit was exceeded", async () => {
  const result = await consumeRateLimit("register:identity", "a@example.com", 5, 900, {
    client: { async $queryRaw() { return []; } },
    secret: "b".repeat(48)
  });
  assert.equal(result.allowed, false);
});

test("rate limiter fails closed without a sufficiently strong Auth secret", async () => {
  await assert.rejects(
    consumeRateLimit("login", "a@example.com", 10, 900, {
      client: { async $queryRaw() { return [{ allowed: true }]; } },
      secret: "short"
    }),
    /at least 32 characters/
  );
});

test("trusted client IP is accepted only from the configured Cloudflare edge header", () => {
  const request = new Request("https://auth.example.test", {
    headers: { "cf-connecting-ip": "203.0.113.10", "x-forwarded-for": "198.51.100.2" }
  });
  assert.equal(getTrustedClientIp(request), "203.0.113.10");
});
