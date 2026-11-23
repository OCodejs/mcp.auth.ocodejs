# Velclaw runner setup for OCodeJS Auth Preview

This is a second GitHub Actions runner process on the Velclaw host, registered only to this repository. It must not reuse or move the existing Velclaw organization runner registration.

## 1. Verify the host first

On the Velclaw runner host, confirm:

```sh
uname -s
uname -m
node --version
npm --version
df -h .
free -h
```

This preview workflow requires Linux ARM64 (`aarch64`) and Node.js 22. Stop if the host is not ARM64, lacks adequate free disk/RAM, or is already under resource pressure. Do not install Docker or privileged container access for this CI job.

## 2. Create a repository-scoped runner

Open:

https://github.com/OCodejs/mcp.auth.ocodejs/settings/actions/runners/new

Select **Linux** and **ARM64**. Use the official download command shown on that page, but extract the runner into a NEW directory, separate from the existing Velclaw runner, for example:

```sh
mkdir -p "$HOME/actions-runner-ocodejs-auth"
cd "$HOME/actions-runner-ocodejs-auth"
```

Download and extract the exact ARM64 archive and version shown by GitHub's setup page. Do not overwrite or reuse the existing Velclaw runner directory.

## 3. Register without exposing the token

Use the repository URL and one-time registration token displayed by GitHub. Enter the token only into the host terminal; never commit it, paste it into Slack/chat, or save it in a workflow secret.

```sh
read -rsp "GitHub runner registration token: " RUNNER_TOKEN
printf '\\n'
./config.sh --url https://github.com/OCodejs/mcp.auth.ocodejs \
  --token "$RUNNER_TOKEN" \
  --name velclaw-ocodejs-auth-preview \
  --labels ocodejs-ci \
  --work _work \
  --unattended
unset RUNNER_TOKEN
```

The runner receives GitHub's default `self-hosted`, OS and architecture labels plus `ocodejs-ci`. Keep the runner repository-scoped; do not register it at organization scope or grant it access to unrelated repositories.

## 4. Install as a separate service

From the new runner directory:

```sh
./svc.sh install
./svc.sh start
./svc.sh status
```

Confirm GitHub shows this runner as **Idle/Online** in the repository's Actions → Runners page. The existing Velclaw runner must remain registered and unchanged.

## 5. Run the isolated smoke workflow

After the runner is online, open:

https://github.com/OCodejs/mcp.auth.ocodejs/actions/workflows/velclaw-runner-smoke.yml

Choose branch `feat/velclaw-ocodejs-runner-preview` and run **OCodeJS Auth - Velclaw Runner Preview** manually.

The workflow is manual-only, read-only, and has no deployment or migration steps. It validates ARM64/Node, regenerates the lockfile in the temporary workspace, uploads that generated lockfile as a short-lived artifact, then runs install, tests, Prisma generation/validation, lint and build.

Review the artifact before proposing any package-lock change. A green runner smoke test does not itself prove OAuth, database connectivity, Auth.js sessions, or a working Preview deployment.

## Security and operations

- Use a dedicated unprivileged OS account for the runner where possible.
- Keep the runner patched and online only when needed.
- Do not run untrusted pull-request code on this persistent self-hosted runner.
- Do not add production secrets or database credentials to this workflow.
- Keep the runner's outbound network access limited to required GitHub/registry endpoints where practical.
- If the runner is no longer needed, stop and remove only this second runner service from its own directory; do not touch the Velclaw runner.
