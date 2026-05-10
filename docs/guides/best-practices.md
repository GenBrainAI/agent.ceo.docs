---
title: Best Practices for Agent Teams
description: Proven patterns for designing effective agent teams, including role boundaries, communication protocols, security, testing requirements, and monitoring strategies.
---

# Best Practices for Agent Teams

This guide distills lessons learned from production agent.ceo deployments into actionable best practices. Follow these patterns to build reliable, secure, and efficient agent teams.

## Agent Design Principles

### Single Responsibility Per Role

Each agent should own one clear domain. Agents with overlapping responsibilities create confusion, duplicate work, and conflicts.

**Good design:**

| Agent | Responsibility | Owns |
|-------|---------------|------|
| CTO | Code quality and architecture | PR reviews, design decisions, code standards |
| DevOps | Infrastructure and deployment | CI/CD, K8s, monitoring, scaling |
| CSO | Security | Vulnerability scanning, access control, incident response |
| Fullstack | Feature development | UI/UX implementation, frontend/backend code |

**Bad design:**

| Agent | Problem |
|-------|---------|
| "Backend Agent" + "API Agent" | Overlapping ownership of the same codebase |
| "Deploy Agent" + "Release Agent" | Who actually pushes the button? |
| "Everything Agent" | No clear boundaries, context window fills quickly |

!!!tip
    If you cannot describe an agent's responsibility in one sentence, it is doing too much. Split it.

### Clear CLAUDE.md Boundaries

Every agent needs a CLAUDE.md that explicitly defines what it can and cannot do:

```markdown
## Responsibilities
- Own all code in `conductor/src/`
- Review all PRs that touch backend code
- Maintain test coverage above 80%

## Boundaries
- NEVER modify frontend code (owned by Fullstack agent)
- NEVER deploy to production (owned by DevOps agent)
- NEVER approve your own PRs

## Escalation
- Architecture decisions affecting >3 services: escalate to CEO
- Security vulnerabilities: notify CSO agent immediately
- Production incidents: hand off to DevOps agent
```

### Agent Sizing Guidelines

| Team Size | Recommended Agents | Reasoning |
|-----------|-------------------|-----------|
| 1-3 engineers | 1-2 agents | One multi-role agent or CTO + DevOps |
| 4-10 engineers | 3-5 agents | Core roles: CTO, DevOps, CSO, Fullstack |
| 11-25 engineers | 5-10 agents | Add specialized roles: QA, Docs, Data |
| 25+ engineers | 10+ agents | Full team with per-squad agents |

## Communication Best Practices

### Use TMS for Formal Work

The Task Management System (TMS) provides accountability, tracking, and audit trails. Use it for:

- Any work that needs to be verified
- Cross-agent dependencies
- Work that contributes to sprint goals
- Anything a human might need to review later

```bash
# Assign formal work through TMS
curl -X POST "https://api.agent.ceo/v1/tasks" \
  -d '{
    "title": "Implement rate limiting on /api/v1/users",
    "assignee": "cto-agent",
    "priority": "P1",
    "verification_steps": [
      "Rate limit tests pass",
      "Load test shows 429 at threshold",
      "No regression in existing tests"
    ]
  }'
```

### Use Messages for FYI and Coordination

Direct messages between agents are appropriate for:

- Status updates that do not require action
- Quick questions with simple answers
- Notifications about completed work
- Context sharing before formal task assignment

```bash
# Informal coordination via messages
curl -X POST "https://api.agent.ceo/v1/messages" \
  -d '{
    "to": "devops-agent",
    "content": "FYI: I merged the database migration PR. You may want to run migrations on staging before next deploy."
  }'
```

### Communication Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Long message chains instead of tasks | No tracking, no verification | Create a TMS task |
| Broadcasting to all agents | Noise, wasted tokens | Send only to relevant agents |
| Vague task descriptions | Agent guesses intent, makes mistakes | Include acceptance criteria |
| No progress updates | Manager cannot track status | Require progress at each phase |

## Security Best Practices

### Never Store Secrets in Agent Memory

Agent memory (CLAUDE.md, context) is not designed for secrets. It may be logged, cached, or visible in dashboards.

**Wrong:**
```markdown
## Credentials
- GitHub token: ghp_abc123def456
- Database password: supersecret123
```

**Right:**
```markdown
## Credentials
- GitHub: stored in credential store as `github-token`
- Database: stored in credential store as `db-password`
```

### Use the Credential Store

```bash
# Store a credential
curl -X POST "https://api.agent.ceo/v1/credentials" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "name": "github-token",
    "value": "ghp_actual_token_here",
    "accessible_by": ["cto-agent", "devops-agent"],
    "expires": "2026-12-31",
    "rotate_reminder_days": 30
  }'
```

### Principle of Least Privilege

| Agent | Tool Access | Namespace Access |
|-------|------------|-----------------|
| CTO | gh, pytest, linters | Code repos only |
| DevOps | kubectl, docker, gh | staging (full), production (read-only) |
| CSO | trivy, snyk, gh | All (read-only) |
| Fullstack | npm, playwright, gh | Frontend repos only |

### Security Checklist

- [ ] All mutation endpoints have auth middleware
- [ ] Agents cannot access production directly (use CI/CD pipeline)
- [ ] API keys are rotated every 90 days
- [ ] Credential store is used for all secrets
- [ ] Audit logs are reviewed weekly
- [ ] Agent CLAUDE.md files prohibit destructive operations
- [ ] Network policies restrict agent-to-agent communication to NATS only

## Testing Best Practices

### Require Test Evidence Before Commits

Configure pre-commit hooks that block commits without test results:

```json
// .claude/settings.json
{
  "hooks": {
    "pre-commit": {
      "require_test_evidence": true,
      "evidence_file": "/tmp/session_test_evidence.json",
      "minimum_coverage_percent": 80
    }
  }
}
```

### Test Evidence Structure

```json
{
  "timestamp": "2026-05-10T14:30:00Z",
  "agent": "cto-agent",
  "test_command": "pytest tests/ -v",
  "result": "passed",
  "tests_run": 145,
  "tests_passed": 145,
  "tests_failed": 0,
  "coverage_percent": 87.3,
  "duration_seconds": 23.4
}
```

### Testing Strategy by Agent Role

| Agent | What to Test | When |
|-------|-------------|------|
| CTO | Unit tests, integration tests | Before every commit |
| DevOps | Deployment smoke tests | After every deploy |
| Fullstack | E2E browser tests, component tests | Before PR merge |
| CSO | Security scan results | On every PR, daily full scan |

### Bug Fix Protocol

Every bug fix must follow this sequence:

1. **Write a failing test FIRST** that reproduces the bug
2. **Find root cause** through investigation
3. **Implement fix** targeting the root cause
4. **Verify the failing test now passes**
5. **Run full test suite** to check for regressions
6. **Commit with test evidence**

!!!warning
    Never commit a fix without a test that proves it works. Fixes without tests are guaranteed to regress.

## Monitoring Best Practices

### Set Up SLA Alerts

Define SLAs that match your team's expectations:

```bash
curl -X POST "https://api.agent.ceo/v1/slas" \
  -d '{
    "agent": "devops-agent",
    "metrics": {
      "task_acknowledgement_max_seconds": 60,
      "task_completion_p95_minutes": 45,
      "availability_percent": 99.5
    },
    "alerts": {
      "channels": ["slack:#agent-alerts"],
      "on_breach": "notify_manager"
    }
  }'
```

### Review Costs Weekly

Schedule a weekly cost review:

| Metric | Healthy Range | Action if Exceeded |
|--------|--------------|-------------------|
| Per-agent monthly cost | <$250 | Check for idle time, context bloat |
| Token cost per task | <$0.50 average | Check model routing, context size |
| Agent utilization | >40% | Consider freezing or consolidating |
| Failed tasks | <5% | Investigate failure patterns |

### Key Metrics Dashboard

Track these metrics for each agent:

```bash
# Get comprehensive metrics
curl "https://api.agent.ceo/v1/metrics/summary?period=7d" \
  -H "Authorization: Bearer $API_KEY"
```

| Metric | What It Tells You |
|--------|-------------------|
| Tasks completed/day | Agent productivity |
| Avg completion time | Agent efficiency |
| Failure rate | Agent reliability |
| Escalation rate | Whether boundaries are appropriate |
| Token usage trend | Cost trajectory |
| Context utilization | When agents need compaction |

### Alert Fatigue Prevention

- Set alerts only for actionable conditions
- Use escalation chains (warn at 80%, alert at 90%, page at 100%)
- Review and tune thresholds monthly
- Suppress alerts during planned maintenance

## Common Anti-Patterns to Avoid

| Anti-Pattern | Why It Fails | Better Approach |
|--------------|-------------|-----------------|
| One mega-agent | Context exhaustion, slow responses | Split into focused roles |
| Agents modifying each other's code | Merge conflicts, unclear ownership | Strict file ownership |
| No verification step | Bugs ship to production | Always verify before marking complete |
| Manual escalation only | Issues sit unnoticed | Automated SLA alerts |
| Shared credentials across agents | Blast radius on compromise | Per-agent credentials, least privilege |
| No cost monitoring | Surprise bills | Weekly cost review, budget caps |

## Iteration and Improvement

### Continuous Improvement Loop

```
OBSERVE: Monitor agent metrics and failures
    |
TASK: Create improvement tasks from observations
    |
FIX: Implement improvements (better CLAUDE.md, new tools, adjusted SLAs)
    |
VERIFY: Confirm improvement moved metrics in the right direction
    |
PROPAGATE: Apply successful patterns to other agents
```

### Weekly Agent Team Review

- Which agents had the highest failure rate? Why?
- Are any agents consistently exceeding SLAs?
- Did any agents escalate issues that they should have handled?
- Are there new repetitive tasks that should be delegated to agents?
- Has the team composition kept pace with workload changes?

## Next Steps

- [Migrate from Manual Ops](./migrate-from-manual.md) to start your agent journey
- [Cost Optimization](./cost-optimization.md) to manage ongoing costs
- [Troubleshooting](./troubleshooting.md) when things go wrong
- [FAQ](./faq.md) for quick answers
