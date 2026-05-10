---
title: Optimizing Agent Costs
description: Strategies to minimize agent.ceo spending while maximizing productivity, including freezing policies, right-sizing teams, task queuing, and token optimization.
---

# Optimizing Agent Costs

agent.ceo pricing is based on agent runtime hours and token consumption. This guide covers strategies to keep costs predictable while getting maximum value from your agent team.

## Understanding the Cost Model

### Pricing Tiers

| Plan | Monthly Cost | Includes | Overage |
|------|-------------|----------|---------|
| Free | $0 | 168 agent-hours (1 agent, always-on) | N/A (paused) |
| Standard | $200/agent/month | Unlimited hours per agent | Per-token after budget |
| Volume (11-50) | $180/agent/month | Unlimited hours per agent | Per-token after budget |
| Volume (51+) | $160/agent/month | Unlimited hours per agent | Per-token after budget |
| Enterprise | Custom | Dedicated infrastructure | Custom SLA |

### What Counts as Usage

| Activity | Billing Impact |
|----------|---------------|
| Agent running (idle) | Counts toward agent-hours |
| Agent processing a task | Counts toward agent-hours + tokens |
| Agent frozen/paused | No charge |
| NATS message delivery | Included |
| API calls to agent.ceo | Included (rate limits apply) |
| Token consumption | Per-model rates apply |

### Token Costs by Model

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Claude Sonnet | $3.00 | $15.00 |
| Claude Opus | $15.00 | $75.00 |
| Claude Haiku | $0.25 | $1.25 |

## Strategy 1: Freeze Inactive Agents

The single biggest cost saver. Agents that are not actively processing tasks should be frozen.

### Manual Freeze

```bash
# Freeze a specific agent
curl -X POST https://api.agent.ceo/v1/agents/devops-agent/freeze \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"reason": "No tasks scheduled until Monday"}'
```

### Automatic Freeze Policies

Set up rules to automatically freeze agents during low-activity periods:

```bash
curl -X POST https://api.agent.ceo/v1/policies/auto-freeze \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "agent": "devops-agent",
    "rules": [
      {
        "condition": "idle_minutes > 60",
        "action": "freeze",
        "wake_on": ["new_task", "scheduled_time"]
      },
      {
        "condition": "time_outside_business_hours",
        "business_hours": {"start": "08:00", "end": "18:00", "timezone": "America/New_York"},
        "action": "freeze",
        "exceptions": ["P0_tasks"]
      }
    ]
  }'
```

!!!tip
    Freezing agents during nights and weekends alone can reduce costs by 65% for teams that operate on a standard work schedule.

### Cost Impact of Freezing

| Schedule | Monthly Hours/Agent | % Savings vs Always-On |
|----------|--------------------|-----------------------|
| Always-on (24/7) | 720 hours | 0% |
| Business hours only (10h/day, weekdays) | 220 hours | 69% |
| On-demand (task-triggered) | 40-100 hours | 86-94% |

## Strategy 2: Right-Size Your Agent Team

More agents is not always better. Evaluate whether each agent carries enough workload to justify its cost.

### Agent Utilization Report

```bash
# Get utilization metrics for all agents
curl "https://api.agent.ceo/v1/costs?period=monthly&group_by=agent&include=utilization" \
  -H "Authorization: Bearer $API_KEY"
```

Example response:

```json
{
  "agents": [
    {"name": "cto-agent", "utilization": 0.82, "tasks_completed": 145, "cost": "$200"},
    {"name": "devops-agent", "utilization": 0.71, "tasks_completed": 230, "cost": "$200"},
    {"name": "qa-agent", "utilization": 0.15, "tasks_completed": 12, "cost": "$200"},
    {"name": "docs-agent", "utilization": 0.08, "tasks_completed": 5, "cost": "$200"}
  ]
}
```

### Right-Sizing Decision Matrix

| Utilization | Action | Reasoning |
|-------------|--------|-----------|
| > 70% | Keep as-is | Agent is well-utilized |
| 40-70% | Consider combining roles | Merge with a related agent |
| 20-40% | Switch to on-demand | Freeze when idle, wake on task |
| < 20% | Consolidate or remove | Redistribute tasks to other agents |

### Consolidation Example

Instead of separate QA and Docs agents at low utilization:

```bash
# Before: 2 agents, $400/month, 23% average utilization
# After: 1 agent with both roles, $200/month, 46% utilization

curl -X PATCH https://api.agent.ceo/v1/agents/qa-agent \
  -d '{
    "roles": ["qa", "documentation"],
    "claude_md_additions": "## Additional Responsibility: Documentation\n..."
  }'
```

## Strategy 3: Task Queuing vs Always-On

Not every agent needs to be running 24/7. Use task queuing for non-urgent work.

### Always-On vs On-Demand Comparison

| Pattern | Best For | Cost Profile |
|---------|----------|--------------|
| Always-on | Incident response, real-time monitoring | Fixed monthly cost |
| On-demand (wake on task) | Scheduled work, batch processing | Pay only when active |
| Scheduled windows | Predictable workloads | Business hours only |

### Configuring On-Demand Agents

```bash
curl -X PATCH https://api.agent.ceo/v1/agents/docs-agent \
  -d '{
    "runtime_mode": "on-demand",
    "wake_triggers": ["task_assigned", "message_received"],
    "idle_timeout_minutes": 30,
    "max_concurrent_tasks": 3
  }'
```

### Task Queue Priority

Queue lower-priority tasks for batch processing during off-peak hours:

```bash
curl -X POST https://api.agent.ceo/v1/tasks \
  -d '{
    "title": "Update API documentation",
    "assignee": "docs-agent",
    "priority": "P3",
    "scheduling": {
      "mode": "batch",
      "preferred_window": "02:00-06:00 UTC",
      "deadline": "2026-05-15T00:00:00Z"
    }
  }'
```

## Strategy 4: Monitor Per-Agent Costs

### Cost Dashboard API

```bash
# Daily cost breakdown
curl "https://api.agent.ceo/v1/costs?period=daily&group_by=agent" \
  -H "Authorization: Bearer $API_KEY"

# Token usage by agent
curl "https://api.agent.ceo/v1/costs/tokens?period=weekly&group_by=agent,model" \
  -H "Authorization: Bearer $API_KEY"

# Cost forecast
curl "https://api.agent.ceo/v1/costs/forecast?horizon=30d" \
  -H "Authorization: Bearer $API_KEY"
```

### Setting Billing Alerts

```bash
# Alert at 80% of monthly budget
curl -X POST https://api.agent.ceo/v1/billing/alerts \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "threshold_percent": 80,
    "notify": ["admin@company.com", "slack:#billing-alerts"],
    "action_on_100_percent": "notify_only"
  }'

# Per-agent budget cap
curl -X POST https://api.agent.ceo/v1/billing/alerts \
  -d '{
    "scope": "agent",
    "agent": "experimental-agent",
    "max_monthly_usd": 150,
    "action_on_limit": "freeze_agent"
  }'
```

!!!warning
    Set the `action_on_100_percent` to `freeze_agents` only if you are comfortable with agents being paused mid-task. Use `notify_only` if uptime is critical.

## Strategy 5: Token Cost Optimization

Tokens are the variable cost component. Optimize them with these techniques:

### Choose the Right Model per Task

| Task Type | Recommended Model | Why |
|-----------|------------------|-----|
| Code review, architecture | Opus | Needs deep reasoning |
| Routine deploys, simple fixes | Sonnet | Good balance of cost/quality |
| Log parsing, classification | Haiku | Simple tasks, high volume |

```bash
# Configure model routing per task type
curl -X POST https://api.agent.ceo/v1/agents/devops-agent/model-routing \
  -d '{
    "rules": [
      {"task_type": "architecture_review", "model": "opus"},
      {"task_type": "deployment", "model": "sonnet"},
      {"task_type": "log_analysis", "model": "haiku"}
    ],
    "default": "sonnet"
  }'
```

### Reduce Context Window Usage

Large context windows consume more tokens. Strategies to reduce context:

1. **Compact CLAUDE.md files**: Keep agent instructions concise
2. **Use file references instead of inline content**: Point agents to files rather than pasting content
3. **Clear completed task history**: Archive old task data regularly
4. **Scope repository access**: Only give agents access to relevant directories

```bash
# Configure context compaction
curl -X PATCH https://api.agent.ceo/v1/agents/cto-agent \
  -d '{
    "context_management": {
      "auto_compact_threshold_tokens": 80000,
      "archive_completed_tasks_after_hours": 24,
      "max_file_read_lines": 500
    }
  }'
```

### Enable Prompt Caching

Prompt caching reduces token costs for repetitive system prompts:

```bash
curl -X PATCH https://api.agent.ceo/v1/agents/devops-agent \
  -d '{
    "caching": {
      "enabled": true,
      "cache_system_prompt": true,
      "cache_claude_md": true,
      "cache_ttl_minutes": 60
    }
  }'
```

!!!tip
    Prompt caching can reduce input token costs by up to 90% for agents with large CLAUDE.md files that process many short tasks.

## Pricing Breakpoint Analysis

### When to Upgrade from Standard to Volume

| Number of Agents | Standard Cost | Volume Cost | Monthly Savings |
|-----------------|---------------|-------------|-----------------|
| 10 | $2,000 | $2,000 | $0 |
| 11 | $2,200 | $1,980 | $220 |
| 20 | $4,000 | $3,600 | $400 |
| 50 | $10,000 | $9,000 | $1,000 |
| 51 | $10,200 | $8,160 | $2,040 |
| 100 | $20,000 | $16,000 | $4,000 |

Volume pricing kicks in automatically at 11+ agents. The biggest jump occurs at 51 agents where per-agent cost drops to $160.

### Free Tier Optimization

The free tier provides 168 agent-hours/month (equivalent to one agent running 24/7 for a week, or one agent at 5.6 hours/day for 30 days).

Maximize free tier value:

1. Run a single multi-role agent instead of multiple specialized ones
2. Use aggressive idle timeouts (15 minutes)
3. Queue non-urgent tasks for batch processing
4. Monitor remaining hours via the dashboard

```bash
# Check remaining free tier hours
curl "https://api.agent.ceo/v1/billing/usage?plan=free" \
  -H "Authorization: Bearer $API_KEY"
```

## Monthly Cost Review Checklist

Run this review weekly or monthly to keep costs optimized:

- [ ] Check agent utilization rates (target: >40% for always-on agents)
- [ ] Review token consumption by model (are expensive models being used for simple tasks?)
- [ ] Verify freeze policies are working (check frozen hours vs expected)
- [ ] Look for cost spikes (investigate any day with >2x average spend)
- [ ] Evaluate if any agents can be consolidated
- [ ] Confirm billing alerts are set and recipients are correct
- [ ] Review forecast vs budget (are you trending over?)

## Next Steps

- [Enterprise Setup](./enterprise-setup.md) for volume pricing and dedicated infrastructure
- [Best Practices](./best-practices.md) for efficient agent team design
- [FAQ](./faq.md) for billing-related questions
