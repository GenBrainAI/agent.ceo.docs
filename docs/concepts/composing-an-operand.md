---
title: Composing an Operand (SA-RUN)
description: >
  How to give a spawned super-agent its charter, its repositories, and its
  credentials at spawn — with a refs-only secrets model where the credential
  value never appears in the composition, the resource, or the logs.
status: draft
category: super-agents
---

# Composing an Operand (SA-RUN)

> **Draft — publish-gated.** Schema below is source-accurate (per CTO). Keep in
> draft until the CEO marks SA-RUN user-verified (dashboard end-to-end acceptance
> pending). Field names are pinned to the code, not illustrative.

[Super-Agents (SEMA)](./super-agents.md) let you spawn a
super-agent as a real, isolated, lifecycle-managed workload. **SA-RUN** is what
turns that empty runtime into a working agent: at spawn, an operand receives its
full **composition** — a **charter**, its **repositories**, and its
**credentials** — after which it clones its repos, runs its charter, and holds
its secrets.

## Two shapes: what you author vs. what the pod sees

There are two versions of a composition, and the difference is the whole security
story:

- **Author-facing composition** — what *you* write. Credentials appear here, but
  only as **references** (`keychain://…`), never as values.
- **Rendered pod-facing `composition.json`** — what the operand actually sees.
  It is the author shape **minus the credentials block**; the credential *values*
  are delivered separately as environment variables from a per-operand Secret.

You author the first. The platform renders the second. The secret value never
crosses from the reference into any document.

## Author-facing composition

This is the "how to compose an operand" example:

```json
{
  "operand_id": "op-acme-releasebot",
  "cli_agent": "claude-code",
  "context": {
    "charter": "You are ReleaseBot. Cut the weekly release, run the test suite, open the PR.",
    "task": "Prepare release v1.4.0 and open the PR",
    "files": ["docs/RELEASING.md"]
  },
  "repos": [
    { "url": "https://github.com/acme/app", "branch": "main", "mount_path": "/workspace/app" }
  ],
  "credentials": [
    { "ref": "keychain://acme/github-pat", "as_env": "GITHUB_TOKEN" },
    { "ref": "keychain://acme/openai-key", "as_env": "OPENAI_API_KEY" }
  ]
}
```

### Fields

| Field | Notes |
|-------|-------|
| `operand_id` | Identifier for the operand. |
| `cli_agent` | The adapter to run. Default `claude-code` (or another supported adapter); maps to `--adapter`. |
| `context.charter` | **Required, immutable.** The operand's marching orders — it cannot edit its own charter. |
| `context.task` | Optional. The specific task for this run. |
| `context.files` | Optional string array of relevant file paths. |
| `repos[]` | `url`, `branch` (default `main`), `mount_path` (**must be absolute**). Repo auth is injected as an env var **at clone time** — never embed a token in the URL (the assembler rejects inlined secrets). |
| `credentials[]` | `ref` + `as_env`. `ref` is a URI reference — `keychain://<org>/<name>` (org-scoped vault) or `sub://<provider>` (subscription creds). `as_env` must be `UPPER_SNAKE_CASE`. The raw secret is never in the spec and never logged. |

## How credentials stay secret (refs-only)

The core invariant: **a secret value never appears in any composition, resource,
or log** — only its reference does.

- You write `{ "ref": "keychain://acme/github-pat", "as_env": "GITHUB_TOKEN" }`.
- At spawn, the value is resolved server-side into a **per-operand Secret**
  (named `operand-credentials`, one per namespace) and injected into the
  operand's environment as `GITHUB_TOKEN` via `envFrom`.
- **Tenant-scoped:** a `keychain://` ref only resolves for its own organization.
- **Fail-closed:** a cross-tenant or invalid ref **fails the spawn** — you never
  get a half-provisioned operand with wrong or missing secrets.
- A scanner enforces the refs-only rule, rejecting inlined tokens
  (`gh_…`, `sk-…`, `AKIA…`, `AIza…`, `xox…`) and `user:pass@` URLs anywhere in the
  document.

## Rendered pod-facing `composition.json`

This is what the operand sees — mounted read-only at
`/etc/operand/composition.json` (the `op-config` ConfigMap, key `composition.json`).
Note the **credentials block is gone** and `charter` is hoisted to the top level:

```json
{
  "operand_id": "op-acme-releasebot",
  "cli_agent": "claude-code",
  "charter": "You are ReleaseBot. Cut the weekly release, run the test suite, open the PR.",
  "task": "Prepare release v1.4.0 and open the PR",
  "files": ["docs/RELEASING.md"],
  "repos": [
    { "url": "https://github.com/acme/app", "branch": "main", "mount_path": "/workspace/app" }
  ]
}
```

The credential **values** arrive as the environment variables named by `as_env`
(`GITHUB_TOKEN`, `OPENAI_API_KEY`) from the per-operand Secret — intentionally
absent from this ConfigMap.

## Running the charter

You normally **don't** run this by hand — the operand entrypoint reads
`composition.json` and runs it for you. For reference, the form is:

```
super-agent run --adapter <cli_agent> --prompt-text "<charter>" --task "<task>" --cwd <primary_repo_mount_path> --json
```

- `--cwd` is the first repo's `mount_path` (omitted if there are no repos).
- `--json` streams one canonical `RunnerEvent` per line.
- With no composition mounted, the image falls back to
  `super-agent serve --host 0.0.0.0 --port 7777`.

## Isolation & teardown

- **Namespace isolation:** each operand gets its **own dedicated namespace** and
  ServiceAccount — no cross-operand reuse.
- **Networking:** default-deny; egress is allowed only to the infra namespace
  (NATS `4222` + Gateway `8080`), plus DNS and outbound HTTPS.
- **Teardown:** delete the namespace, and it **cascades** every operand resource
  — the `operand-credentials` Secret, the `op-config` ConfigMap, the Deployment,
  and any PVC are all destroyed with it. Idempotent.

## Security summary

| Property | Guarantee |
|----------|-----------|
| Secret value in composition / CR / logs | **Never** — refs-only, enforced by a scanner |
| Cross-tenant / invalid credential ref | **Spawn fails closed** — no half-provisioned operand |
| Credential storage | Per-operand `operand-credentials` Secret, injected via `envFrom` |
| Credential lifetime | Destroyed on teardown (namespace delete cascades) |
| Isolation | Dedicated namespace + ServiceAccount per operand, default-deny network |

## Related

- [Super-Agents (SEMA)](./super-agents.md) — the lifecycle and isolation SA-RUN
  builds on.
- Concept: **agenticware** — a self-improving agentic organization you build or
  buy.
