---
title: Migrating from Manual Ops to AI Agents
description: A step-by-step guide to identifying repetitive tasks, mapping them to agent roles, and gradually delegating operations to AI agents on agent.ceo.
---

# Migrating from Manual Ops to AI Agents

Moving from manual operations to an AI-powered agent team is not an overnight switch. This guide walks you through a phased migration strategy that minimizes risk while maximizing the speed at which you reclaim engineering hours.

## Why Migrate?

Manual operations consume your most expensive resource: senior engineers' attention. Common patterns that signal readiness for agent migration:

- Deployments require a human to run scripts and watch dashboards
- Code reviews sit in queue for hours or days
- Incident response starts with "who's on call?"
- Repetitive tasks follow documented runbooks that rarely change

## Phase 1: Identify Repetitive Tasks

Start by auditing your current operations. Look for tasks that are:

| Criteria | Example | Agent Fit |
|----------|---------|-----------|
| Repetitive (>3x/week) | Deploying to staging | High |
| Well-documented | Following a runbook | High |
| Time-sensitive | Incident triage | High |
| Requires judgment | Architecture decisions | Medium |
| Creative/novel | Product strategy | Low |

### Task Inventory Template

Create a spreadsheet with these columns:

```
Task Name | Frequency | Time/Occurrence | Current Owner | Runbook Exists? | Risk Level
```

!!!tip
    Start with tasks that have existing runbooks. These translate directly into agent instructions via CLAUDE.md files.

## Phase 2: Map Tasks to Agent Roles

agent.ceo uses role-based agents. Each agent has a single responsibility and clear boundaries. Map your task inventory to standard roles:

### Common Role Mappings

| Manual Process | Agent Role | What It Handles |
|---------------|------------|-----------------|
| Manual deployments | DevOps Agent | CI/CD pipelines, K8s management, rollbacks |
| Code review queue | CTO Agent | PR reviews, architecture decisions, code quality |
| Incident response | CSO Agent | Alert triage, security scanning, threat response |
| Customer support triage | Support Agent | Ticket classification, initial responses |
| Infrastructure monitoring | DevOps Agent | Health checks, scaling decisions |
| Release coordination | Release Agent | Changelog, version bumps, release notes |

### Defining Agent Boundaries

Each agent needs a CLAUDE.md that specifies:

```markdown
## Responsibilities
- What this agent owns (explicit list)
- Tools it can use (kubectl, gh, etc.)

## Boundaries
- What it must NOT do
- When to escalate to a human
- Which other agents it can delegate to
```

See the [Agent Configuration Guide](./agent-configuration.md) for detailed CLAUDE.md authoring.

## Phase 3: Deploy a Starter Template

Begin with a single agent handling your lowest-risk, highest-frequency task.

### Recommended First Agent: DevOps

DevOps is ideal as a first agent because:

1. Tasks are well-defined (deploy, rollback, scale)
2. Success is measurable (deploy succeeded or failed)
3. Guardrails are clear (read-only in prod, full access in staging)

```bash
# Deploy your first agent using the CLI
agent-ceo deploy --template devops-starter \
  --org your-org \
  --name "devops-agent" \
  --config ./agent-configs/devops.yaml
```

Or via the API:

```bash
curl -X POST https://api.agent.ceo/v1/agents \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "template": "devops-starter",
    "name": "devops-agent",
    "org": "your-org",
    "config": {
      "branch": "devops",
      "tools": ["kubectl", "gh", "docker"],
      "namespace": "staging"
    }
  }'
```

### Starter Template Options

| Template | Best For | Included Tools |
|----------|----------|----------------|
| `devops-starter` | CI/CD and infrastructure | kubectl, gh, docker |
| `cto-starter` | Code review and architecture | gh, pytest, linters |
| `security-starter` | Security scanning and alerts | trivy, snyk, gh |
| `support-starter` | Customer support triage | email, ticketing APIs |

## Phase 4: Gradually Delegate

Follow the delegation ladder to build confidence:

### Level 1: Observe Only (Week 1-2)

The agent monitors and reports but takes no action.

```yaml
# loop_control.json
{
  "mode": "observe",
  "report_to": "ceo",
  "report_frequency": "daily",
  "actions_allowed": false
}
```

What to watch for:

- Are the agent's recommendations accurate?
- Does it identify the same issues humans would?
- Are there false positives?

### Level 2: Suggest and Confirm (Week 3-4)

The agent proposes actions and waits for human approval.

```yaml
{
  "mode": "suggest",
  "approval_required": true,
  "approvers": ["your-email@company.com"],
  "timeout_minutes": 30
}
```

### Level 3: Act on Low-Risk (Week 5-8)

The agent executes low-risk tasks autonomously, escalates high-risk ones.

```yaml
{
  "mode": "autonomous",
  "autonomous_actions": ["deploy-staging", "run-tests", "create-pr"],
  "escalate_actions": ["deploy-production", "delete-resources", "modify-permissions"]
}
```

### Level 4: Full Autonomy with Guardrails (Week 9+)

The agent operates independently within defined safety boundaries.

```yaml
{
  "mode": "autonomous",
  "guardrails": {
    "read_only_namespaces": ["production"],
    "max_concurrent_deploys": 1,
    "require_test_evidence": true,
    "rollback_on_failure": true
  }
}
```

## Human Oversight Patterns

Even at full autonomy, maintain oversight through these patterns:

### 1. SLA Alerting

Set SLA thresholds that notify humans when agents fall behind:

```bash
curl -X POST https://api.agent.ceo/v1/slas \
  -d '{
    "agent": "devops-agent",
    "metric": "task_completion_time",
    "threshold_minutes": 30,
    "alert_channel": "slack:#ops-alerts"
  }'
```

### 2. Cost Monitoring

Review per-agent costs weekly to catch runaway usage:

```bash
# Get cost breakdown
curl https://api.agent.ceo/v1/costs?period=weekly&group_by=agent
```

### 3. Audit Logs

All agent actions are logged and reviewable:

```bash
# Review agent actions for the past 24h
curl https://api.agent.ceo/v1/audit?agent=devops-agent&since=24h
```

### 4. Kill Switch

Every agent has an immediate freeze capability:

```bash
# Immediately pause an agent
agent-ceo freeze --agent devops-agent --reason "investigating anomaly"
```

## Real-World Migration Example

**Company**: 12-person startup, 3 engineers doing manual ops

**Before**:
- 2 hours/day on deployments and monitoring
- 1 hour/day on code review
- 30 minutes/day on security scanning

**Migration Timeline**:

| Week | Action | Result |
|------|--------|--------|
| 1-2 | Deployed DevOps agent in observe mode | Identified 15 deployment patterns |
| 3-4 | Moved to suggest-and-confirm | Agent handled 80% of staging deploys |
| 5-6 | Added CTO agent for PR reviews | Review time dropped from 4h to 20min |
| 7-8 | Full autonomy for staging deploys | Engineers reclaimed 1.5h/day |
| 9-10 | Added CSO agent for security | Automated daily vulnerability scans |

**After**:
- Engineering hours saved: ~18h/week
- Deployment frequency: 3x increase
- Mean time to first review: 4h to 20min

## Common Migration Mistakes

!!!warning
    Avoid these pitfalls that commonly derail migrations.

1. **Going too fast**: Skipping the observe phase leads to trust issues when agents make mistakes early.
2. **Too many agents at once**: Start with one. Add the next only after the first is stable for 2+ weeks.
3. **Unclear boundaries**: Overlapping responsibilities between agents cause conflicts. Define ownership explicitly.
4. **No rollback plan**: Always maintain the ability to revert to manual operations.
5. **Ignoring the human loop**: Agents augment humans, they don't replace judgment. Keep escalation paths clear.

## Next Steps

- [Enterprise Setup Guide](./enterprise-setup.md) for large-scale deployments
- [Cost Optimization](./cost-optimization.md) to manage your agent budget
- [Best Practices](./best-practices.md) for designing agent teams
