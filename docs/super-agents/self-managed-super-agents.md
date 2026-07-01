---
title: Self-Managed Super-Agents (SEMA)
description: >
  Spawn, operate, and tear down super-agents as real, persistent, isolated
  workloads with a full lifecycle. Covers the lifecycle, tenancy isolation,
  observability, and what is shipped vs. rolling out.
status: draft
category: super-agents
---

# Self-Managed Super-Agents (SEMA)

Self-Managed Super-Agents (SEMA) are the platform's internal super-agents that an
organization **spawns, operates, and tears down** as real, persistent, isolated
workloads — not ephemeral in-process objects. Each super-agent (an *operand*)
runs as a first-class Kubernetes workload with its own identity, isolation, and
lifecycle.

> **Status legend:** ✅ **Available** (shipped, verified) · 🟡 **Rolling out**
> (actively shipping — do not treat as complete).

## Concepts

| Term | Meaning |
|------|---------|
| **Super-agent** | A real, persistent, isolated agent workload managed by the platform. |
| **Operand** | The running instance of a super-agent (its namespace + pod). |
| **Charter** | The mandate a super-agent executes against its attached repositories. |
| **Fleet graph** | Live connectivity view of the super-agents in an organization. |

## Lifecycle ✅ Available

The full lifecycle is shipped and verified end-to-end on staging. Each transition
is a real infrastructure operation.

| Action | What happens |
|--------|--------------|
| **Spawn** | The operand is created; it comes up in its **own namespace and pod** and reaches `Running`. It persists until deleted. |
| **Pause** | The operand is **scaled to zero** — it stops consuming compute while its identity and configuration persist. |
| **Resume** | The operand is brought back from zero to `Running`. |
| **Delete** | **Clean teardown** — namespace, pod, and associated resources are removed (not orphaned). |

```
spawn ──▶ Running ──pause──▶ (scaled to 0) ──resume──▶ Running ──delete──▶ (clean teardown)
```

**Verified:** spawn → Running → pause → resume → delete, green end-to-end on
staging.

## Tenancy isolation ✅ Available

Isolation is layered — defense in depth — and security-reviewed to a GO. No
single control is load-bearing on its own.

- **Namespace per operand** — every super-agent gets its own Kubernetes
  namespace (a hard boundary).
- **Per-operand default-deny NetworkPolicy** — nothing reaches the operand, and
  the operand reaches nothing, unless explicitly allowed.
- **Reserved-tenant blocklist** — protected/reserved tenants cannot be targeted.
- **Cross-tenant guard** — attempts to cross a tenant boundary are refused with a
  **403**.

## Observability & operations ✅ Available

- **Lifecycle controls** — spawn / pause / resume / delete as above.
- **Fleet graph** — a live connectivity view of the super-agents in your
  organization and how they relate.

## Credentials & charter execution (SA-RUN) 🟡 Rolling out

> **Rolling out — do not treat as complete.** The isolation and lifecycle below
> are available today; the execution path is actively shipping on top of them.

An operand is designed to obtain credentials and execute its charter:

- **Credential sources:** the organization **vault** (referenced as
  `keychain://…`) or an org-level **subscription key** (to consolidate spend).
- **Credential resolver:** decides which secret an operand may use. **Shipped.**
- **Credential injection:** delivering the resolved secret into the operand.
  **Landing now.**
- **Charter execution:** the operand executes its charter against attached
  repositories. **Rolling out.**

## Horizontal scale 🟡 Designed / next

- **Packing** — many super-agents per pod (target on the order of ~20 per pod)
  with **elastic pod growth** as demand rises. **Designed; next up — not yet
  live.**

## Summary

SEMA makes an organization's agents real production workloads: **spawnable,
isolatable, pausable, observable, and cleanly disposable today**, with charter
execution (SA-RUN) and horizontal packing rolling out on that foundation. It is
the base layer the rest of the platform's agentic organization builds on.

## Related

- Concept: **agenticware** — a self-improving agentic organization you build or
  buy.
- Concept: **cybergenic formation** — how an agentic organization steers and
  evolves its own structure.
- Pattern: the Observable Loop operating model.
