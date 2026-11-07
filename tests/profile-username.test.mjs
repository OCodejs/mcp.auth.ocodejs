import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProfileUsername, isReservedProfileUsername } from "../lib/profile-username.mjs";

test("normalizes names into stable URL-safe usernames", () => {
  assert.equal(normalizeProfileUsername("Nguyễn Văn A"), "nguyen-van-a");
  assert.equal(normalizeProfileUsername("  Dev Team  "), "dev-team");
  assert.equal(normalizeProfileUsername("Alice@Example.com"), "alice-example-com");
});

test("falls back for empty or too-short names", () => {
  assert.equal(normalizeProfileUsername(""), "member");
  assert.equal(normalizeProfileUsername("ab"), "member");
});

test("reserved platform routes cannot be claimed", () => {
  assert.equal(isReservedProfileUsername("admin"), true);
  assert.equal(normalizeProfileUsername("admin"), "member");
});
