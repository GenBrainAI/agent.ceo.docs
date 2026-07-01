---
title: The Observable Loop
description: >
  The operating model behind agentceo — builders build from a rough spec, a
  single observer judges current-versus-better on evidence and drives swaps to
  convergence. Includes the observer/observed skills reference.
status: draft
category: patterns
---

# The Observable Loop

The Observable Loop is the operating model agentceo uses to move work from a
rough idea to "done" without letting quality regress to the mean. It separates
the two responsibilities that most multi-agent systems fatally merge —
**generation** and **judgment** — and gives judgment a single, evidence-bound
seat.

> **In one line:** many builders build from a rough spec; one observer judges
> current-versus-better on evidence and drives swaps until the work converges.

## Why it exists

When the agent that produces work is also the agent that decides the work is
good, there is no quality process — only self-assessment, which averages out to
the mean of whatever the fleet happened to generate. The Observable Loop makes
judgment a distinct, accountable role so that "better" has a definite meaning and
a single owner.

## Roles

### Builder (the observed)

- Takes a **rough spec** — intent and constraints, with the "how" left open.
- Builds with latitude. A rough spec is not a disguised script.
- Commits and pushes often; leaves progress notes (including token/time cost).
- Stays queryable so the observer can inspect state at any time.
- Accepts evidence-based swaps.

There can be many builders working in parallel. Building is the axis that scales.

### Observer

- Does **not** build.
- Judges **current versus better** on evidence — tests, a working endpoint, a
  diff, a reproduced behavior, a moved metric. Never preference or taste.
- Drives **swaps**: when a demonstrably better state exists, moves the
  organization to it.
- **Calls convergence** when no demonstrably better state remains. This — not a
  timer, not a builder's self-declaration — is what marks a task done.

There is exactly **one** observer per loop. Judgment is kept singular on purpose;
it is what keeps quality coherent as builders scale out.

## The loop

```
rough spec
    │
    ▼
┌─────────────┐      evidence      ┌──────────────┐
│  builders   │ ─────────────────▶ │   observer   │
│  (observed) │                    │  current vs. │
│  build,     │ ◀───────────────── │   better?    │
│  commit,    │   evidence-based   └──────┬───────┘
│  stay       │       swaps               │
│  queryable  │                           │ no better state?
└─────────────┘                           ▼
                                     convergence  ✓ done
```

1. A **rough spec** enters the loop.
2. Builders build, committing and pushing often and leaving progress notes.
3. The observer inspects the current state and asks: *is there a demonstrably
   better state?*
4. If yes, the observer drives a **swap** toward it; builders accept and adjust.
5. Repeat until the observer can find no better state and **calls convergence**.

## Key properties

| Property | Why it matters |
|----------|----------------|
| **Fails safe** | A bad state is simply never converged on; it never becomes the accepted state. |
| **Scales the right axis** | Building parallelizes across many agents; judgment stays singular and coherent. |
| **Legible** | Because builders stay queryable and the observer decides on evidence, an outside reviewer can reconstruct *why* the org did what it did. |
| **Current-vs-better, not pass/fail** | Reframes a review gate as an optimization loop that drives toward the best available state. |

## The observed contract

Any agent operating under observation works to this explicit contract:

- Build freely from the rough spec.
- Commit and push often.
- Leave progress notes, including token and time cost.
- Stay queryable.
- Accept evidence-based swaps.
- Done is when the observer calls convergence.

The observer is correspondingly bound to judge current-versus-better on evidence
and drive swaps toward convergence — nothing more, nothing less.

## Skills reference: `observer` and `observed`

The two seats of the loop ship as installable skills so any agent can take either
role without re-litigating the rules. Both live in `agent-hub-skills` (`main`).

### `observed`

Install this skill on any agent that will build under observation. It encodes the
observed contract above: build from the rough spec with latitude, commit/push
often, leave progress + token/time notes, stay queryable, accept evidence-based
swaps, and treat the task as done only when the observer calls convergence.

**When to use:** any builder assigned a task marked "you are OBSERVED" or
delivered as a rough spec.

### `observer`

Install this skill on the single agent holding the observer seat for a loop. It
encodes the observer's discipline: judge current-versus-better strictly on
evidence, drive swaps toward the better state, and call convergence only when no
demonstrably better state remains. The observer does not build.

**When to use:** when you are designated the single point of judgment for a
converging feature or task.

> **One observer per loop.** Installing `observer` on multiple agents for the
> same loop defeats the pattern — judgment must stay singular to stay coherent.

## Related

- Pattern source: `cyborgenic-patterns/patterns/observable-loop.md`
- Skills: `observer`, `observed` (`agent-hub-skills`, `main`)
- Concept: cybergenic formation — how an agentic organization steers and evolves
  its own structure.
