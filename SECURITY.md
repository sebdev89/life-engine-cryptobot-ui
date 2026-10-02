# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

- Use GitHub's private vulnerability reporting: **Security → Report a vulnerability** on this repository.
- If that is not available to you, open a regular issue that only says you have a security report and asks for a
  private channel — without any technical detail — and the maintainer will contact you.

Include what you found, how to reproduce it, and the impact you expect. You will get an acknowledgement within a few
days. Please give us a reasonable time to fix the issue before disclosing it.

This UI is the front end of a hackathon project that runs on **Solana devnet only**. It computes nothing on its own:
every figure it shows comes from the service API
([`life-engine-cryptobot-service`](https://github.com/sebdev89/life-engine-cryptobot-service)), whose
[SECURITY.md](https://github.com/sebdev89/life-engine-cryptobot-service/blob/main/SECURITY.md) describes the signer,
validator and secrets model.

## Secrets model

- **No secret lives in this repository.** The UI is a static single-page app; `public/config.js` holds only local
  development URLs (auth, service, cluster name), and in Docker nginx serves a generated `config.js` with the real URLs.
- **The demo token is short-lived and never committed.** The demo stack has no login service: the service's
  `scripts/demo/ui-url.sh` mints a short-lived demo token and the UI consumes `?token=` once. Screenshot tooling takes
  `UI_TOKEN` from the environment only.
- **The UI never holds a private key.** Signing happens in the service's isolated `signer`, behind its `validator`.

## Repository history audit (2026-10-02)

The full Git history (66 commits, all refs) was scanned with **gitleaks 8.30.1** (`gitleaks git`, values redacted).

- **Result:** 1 finding — `generic-api-key` in `src/app/lineage/lineage.html:10`.
- **Classification:** false positive. It is an Angular template expression comparing a map key name
  (`lv.key === 'L0_SIGNED'`), not a credential. It is listed, with this reason, in `.gitleaksignore`.

No secret values are reproduced in this document.
