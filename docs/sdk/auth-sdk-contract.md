# OCodeJS Auth SDK Contract (Draft)

This contract is intentionally issuer-neutral until the Authorization Server has a verified Preview origin and discovery document.

## Package boundaries

- `@ocodejs/auth-js`: browser-safe PKCE and authorization URL helpers; no client secret support.
- `@ocodejs/auth-react`: React provider and hooks over the browser-safe client.
- `@ocodejs/auth-next`: server-only authorization-code exchange and session integration for Next.js.

## Security rules

- Browser and React packages are public-client only. They must never accept or bundle a client secret.
- Authorization Code + PKCE S256 is the only browser flow.
- Generate cryptographically random state, nonce, and code verifier using Web Crypto.
- Keep transient PKCE transaction state in session-scoped storage and consume it once.
- Validate the returned state before code exchange.
- Server-side token exchange reads confidential client secrets only from server environment variables.
- Do not store refresh tokens in localStorage, sessionStorage, or React state.
- Never expose raw access/refresh tokens to UI components by default.
- Discovery must be fetched from a preconfigured HTTPS issuer; no user-controlled issuer URL.
- Resource APIs must validate issuer, audience, signature, expiry, and required scopes.

## Initial API surface proposal

```ts
// @ocodejs/auth-js
const auth = createOCodeJSAuthClient({
  issuer: "https://<verified-issuer>",
  clientId: "public-client-id",
  redirectUri: "https://app.example/callback",
  scopes: ["openid", "profile", "email"],
});

await auth.signIn();
const transaction = await auth.handleCallback(window.location.href);
```

```tsx
// @ocodejs/auth-react
<OCodeJSAuthProvider client={auth}>
  <App />
</OCodeJSAuthProvider>

const { status, signIn, signOut, user } = useOCodeJSAuth();
```

```ts
// @ocodejs/auth-next — server-only
const session = await getOCodeJSSession({
  issuer: process.env.OCODEJS_ISSUER!,
  clientId: process.env.OCODEJS_CLIENT_ID!,
  clientSecret: process.env.OCODEJS_CLIENT_SECRET!,
});
```

## Release gates

The packages must not be published or described as production-ready until the issuer discovery URL, callback contract, token claims, logout behavior, refresh-token policy, and conformance tests are fixed. The first SDK milestone is source packages plus mocked protocol tests; live integration waits for the Node Preview issuer.
