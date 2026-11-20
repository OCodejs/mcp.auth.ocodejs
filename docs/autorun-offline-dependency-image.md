# AutoRun offline dependency image

This recipe is intentionally gated. It does not enable job execution, deploy an image, or register a runner.

## Source identity

The image is built from an exact full commit SHA. The build records:
- source commit SHA;
- SHA-256 of package-lock.json;
- Prisma CLI and client version;
- OCI image digest;
- exported image archive SHA-256.

The build must stop if package.json and the package-lock root disagree. Do not regenerate or silently rewrite the lockfile during image construction.

## Builder network policy

The builder is a dedicated, ephemeral, rootless Docker host. A proxy URL alone is NOT an egress control. Before registering the host:
1. Deny direct outbound TCP/UDP from the builder at the host/network firewall.
2. Allow the builder to reach only the authenticated egress proxy.
3. On the proxy, allow exact npm registry/package endpoints and the exact Prisma engine distribution endpoints needed by this lockfile and target platform.
4. Deny arbitrary CONNECT destinations, arbitrary ports, IP literals, redirects to unapproved hosts, and non-HTTPS traffic.
5. Restrict DNS to the approved resolver and log destination host, decision, byte count and timestamp without recording credentials.
6. Keep NO_PROXY empty; fail closed if the proxy is unavailable.
7. Pin the builder base image by digest before productionizing this recipe.

Do not use Docker's default bridge or host networking as a substitute. Runtime jobs always use --network none.

## Dependency consistency gate

The current target branch was inspected at source SHA
`7a0842b0a0e3fd3b6c245e6cb107b186200b83b5`.
Its package.json and package-lock.json are currently inconsistent:
- manifest declares `@prisma/adapter-pg@6.19.3`;
- lock root declares `@prisma/adapter-neon@6.19.3`;
- the lock root also differs in other package entries.

Therefore `npm ci` and image construction must remain blocked until a separately reviewed lockfile repair makes the manifest and lock agree. The preflight script reports mismatches and does not mutate files.

## Runtime contract

The dependency image is only an immutable source of dependencies. For every job:
- load image by verified digest;
- use --network none;
- run non-root with cap-drop ALL, no-new-privileges, read-only rootfs, bounded tmpfs, CPU/memory/PID/time limits;
- no host bind mounts, devices, Docker socket, host namespaces or runner credentials;
- supply source checkout as a streamed archive into tmpfs;
- verify dependency tree and Prisma Client offline before command allowlist execution;
- destroy container and writable layers after every outcome.

## Acceptance gates

Do not dispatch the image workflow until a dedicated rootless builder is registered and host firewall policy has been independently verified. Do not connect AutoRun to mcp.auth.ocodejs until image digest, lock hash, Prisma verification, offline execution and runtime escape tests all pass.
