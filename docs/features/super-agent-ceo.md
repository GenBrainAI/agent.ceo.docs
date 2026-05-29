---
title: Self-Hosted Nodes (super-agent-ceo)
description: Turn any machine into an agent.ceo node with the super-agent-ceo CLI. Connect a laptop or server, then drive it from your org's agents — read/write files, run commands, and execute prompts on your own hardware, sandboxed.
---

# Self-Hosted Nodes — `super-agent-ceo`

Most agent.ceo agents run in our cloud. **`super-agent-ceo`** lets you connect your **own** machine — a laptop, a build server, an on-prem box — as a first-class node in your organization. Once connected, your org's agents can read and write files, run commands, and execute prompts **on that machine**, inside a sandbox you control.

Two roles make this work:

- **Operator** — any agent in your org (CEO, CTO, QA, …) that drives a node.
- **Operand** — the self-hosted node: your machine running the `super-agent-ceo` CLI.

```mermaid
flowchart LR
    H[You] -->|/super-agent-ceo my-laptop "run the tests"| OP[Operator agent e.g. CTO]
    OP -->|prompt over NATS| ND[Operand node = your machine]
    ND -->|result| OP --> H
```

---

## Install

```bash
go install github.com/GenBrainAI/agent-hub/cmd/super-agent-ceo@latest
# or, for servers:
docker pull ghcr.io/genbrain/super-agent-ceo:latest
```

A single static binary — no runtime dependencies.

## Authenticate

Mint an API key in the dashboard (**Settings → API Keys**), then either:

```bash
# Interactive / laptop:
super-agent-ceo login --api-key <your-key>

# Backend / headless / CI — no login step, the CLI reads the env var:
export SUPER_AGENT_CEO_TOKEN=<your-key>      # SUPER_AGENT_CEO_API_KEY also accepted
```

The key is stored in your OS keychain (or a `0600` file on headless Linux). The env var takes precedence over a stored key.

## Connect

```bash
super-agent-ceo connect --name my-laptop --mode local
```

Your machine now appears in your org as an online node. `connect` opens an **outbound** WSS connection (port 443 only — no inbound ports), publishes a presence event, and blocks until you stop it (Ctrl-C).

Pick a memorable `--name` — that is exactly how operators address the node.

---

## Drive a node from your agents

Tell any of your org's agents to use a node by name:

```text
/super-agent-ceo my-laptop  run the e2e suite in ./tests and summarise failures
```

The operator agent sends the instruction to that node, which runs it locally and returns the result. Agents can also discover and invoke nodes programmatically with the `list_super_agent_ceo_nodes` and `invoke_super_agent_ceo` tools.

!!! note
    A node only executes prompts if you opted in at connect time (see `--prompt-command` below). Otherwise it replies with a clear "prompts not enabled" message — that is expected, not an error.

---

## Security model — safe by default

Connecting a node does **not** hand your whole machine to the cloud. Three independent layers:

| Layer | Default | What it does |
|-------|---------|--------------|
| **Filesystem sandbox** | on | File operations are confined to `~/super-agent-ceo/<session>/`. Anything outside is refused. Widen explicitly with `--allow-fs <path>` (comma-separated). |
| **`bash_run`** | **off** | Running shell commands is opt-in via `--allow-bash`. |
| **Prompt execution** | **off** | Running operator prompts is opt-in via `--prompt-command "<cmd>"` (e.g. `--prompt-command "claude -p"`). The prompt arrives on stdin and runs inside the sandbox root. |
| **Origin gate** | on | Only agents in *your* org can reach the node; cross-org messages are dropped. |

Example — a node that accepts prompts and can read one project directory, but cannot run arbitrary shell:

```bash
super-agent-ceo connect --name dev-laptop \
  --allow-fs ~/projects/myapp \
  --prompt-command "claude -p"
```

`super-agent-ceo status` always prints exactly what is enabled, so there is no silent misconfiguration. Sensitive paths (`~/.ssh`, `~/.aws`, …) trigger a startup warning if you allow-list them.

## Authorization (org-scoped)

Operators can only see and drive nodes **in their own org** — there is no cross-org access. Finer-grained grants (which agent may do which operation on which node) follow your organization's API-key scopes.

---

## Commands

| Command | What it does |
|---------|--------------|
| `login --api-key <key>` | Store + validate your key |
| `connect [--name …] [--mode local\|backend] [--allow-fs …] [--allow-bash] [--prompt-command …]` | Connect the node and stay online |
| `status` | Show the active session + every enforcement setting |
| `disconnect` | Cleanly disconnect and de-register |

Full CLI reference: [`cmd/super-agent-ceo/README.md`](https://github.com/GenBrainAI/agent-hub/tree/main/cmd/super-agent-ceo) in the agent-hub repository.

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `no api key found` | Run `login`, or set `SUPER_AGENT_CEO_TOKEN`. |
| Operator gets *"prompts not enabled"* | The node was not started with `--prompt-command`. Reconnect with it. |
| Operator gets *"node did not respond"* | The node is offline, or prompts are not enabled. Check it is connected. |
| *"No node named …"* | The name does not match a connected node in your org. Ask the agent to list nodes. |
| File operation refused (`EPERM`) | The path is outside the sandbox. Add it with `--allow-fs` (and restart). |
