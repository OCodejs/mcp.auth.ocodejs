import assert from "node:assert/strict";
import test from "node:test";
import { createOptionalOidcProvider, validateOidcIssuer } from "../lib/auth-oidc.ts";

const env = (issuer = "https://login.example.com/tenant") => ({
  AUTH_OIDC_ISSUER: issuer,
  AUTH_OIDC_ID: "preview-client",
  AUTH_OIDC_SECRET: "test-only-secret"
});

test("OIDC adapter stays disabled when no provider credentials are configured", () => {
  assert.deepEqual(createOptionalOidcProvider({}), []);
});

test("accepts HTTPS issuer and enables PKCE, state, and nonce checks", () => {
  const [provider] = createOptionalOidcProvider(env());
  assert.equal(provider.issuer, "https://login.example.com/tenant");
  assert.match(provider.id, /^ocodejs-oidc-[a-f0-9]{16}$/);
  assert.deepEqual(provider.checks, ["pkce", "state", "nonce"]);
});

test("different issuers receive different persisted provider ids", () => {
  const [first] = createOptionalOidcProvider(env("https://issuer-one.example.com"));
  const [second] = createOptionalOidcProvider(env("https://issuer-two.example.com"));
  assert.notEqual(first.id, second.id);
});

test("rejects partial provider configuration", () => {
  assert.throws(
    () => createOptionalOidcProvider({ AUTH_OIDC_ISSUER: "https://login.example.com" }),
    /Configure AUTH_OIDC_ISSUER/
  );
});

test("rejects public HTTP issuers", () => {
  assert.throws(
    () => validateOidcIssuer("http://login.example.com", "development"),
    /must use HTTPS/
  );
});

test("allows HTTP localhost only in explicit local development", () => {
  assert.equal(validateOidcIssuer("http://localhost:8080/issuer", "development"), "http://localhost:8080/issuer");
  assert.throws(
    () => validateOidcIssuer("http://localhost:8080/issuer", "production"),
    /must use HTTPS/
  );
  assert.throws(
    () => validateOidcIssuer("http://localhost:8080/issuer", "staging"),
    /must use HTTPS/
  );
  assert.throws(
    () => validateOidcIssuer("http://localhost:8080/issuer", undefined),
    /must use HTTPS/
  );
});

test("rejects issuer URLs with credentials, query, or fragment", () => {
  assert.throws(() => validateOidcIssuer("https://user:pass@login.example.com"), /must not contain credentials/);
  assert.throws(() => validateOidcIssuer("https://login.example.com?next=internal"), /must not contain credentials/);
  assert.throws(() => validateOidcIssuer("https://login.example.com#fragment"), /must not contain credentials/);
});
