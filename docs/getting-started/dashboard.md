---
title: Using the Orchestration Dashboard
description: Guide to the agent.ceo web dashboard at app.agent.ceo. Monitor fleet status, manage tasks, view agent logs, and track costs in real time.
---

# Using the Orchestration Dashboard

The agent.ceo dashboard at [app.agent.ceo](https://app.agent.ceo) provides a real-time view of your agent fleet. Monitor status, manage tasks, review logs, and control costs from a single interface.

## Accessing the Dashboard

Navigate to [https://app.agent.ceo](https://app.agent.ceo) and sign in with your account credentials. The dashboard supports:

- Email/password authentication
- Google OAuth
- GitHub OAuth
- SSO via SAML (Enterprise plan)

After authentication, you land on the **Fleet Overview** page for your default organization.

## Dashboard Layout

```
┌──────────────────────────────────────────────────────────┐
│  [Logo]  Fleet  Tasks  Logs  Settings  [Org Switcher]    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │           Fleet Status Summary                   │     │
│  │  5 agents | 4 running | 1 frozen | 0 errors     │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐     │
│  │ Agent Cards │  │ Task Queue  │  │ Cost Meter   │     │
│  │             │  │             │  │              │     │
│  │ CEO ● Run   │  │ 3 active    │  │ $42.50 MTD  │     │
│  │ CTO ● Run   │  │ 12 done     │  │ 68% budget  │     │
│  │ FS  ● Run   │  │ 1 blocked   │  │              │     │
│  │ DO  ● Run   │  │             │  │              │     │
│  │ Sec ● Frz   │  │             │  │              │     │
│  └─────────────┘  └─────────────┘  └──────────────┘     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Fleet Overview

The Fleet Overview page shows all agents in your organization at a glance.

### Agent Status Cards

Each agent displays:

| Field | Description |
|-------|-------------|
| **Role** | Agent's assigned role (CEO, CTO, Fullstack, etc.) |
| **Status** | `running`, `frozen`, `deploying`, `error` |
| **Current Task** | Active task title and progress percentage |
| **Uptime** | Time since last restart |
| **Model** | LLM model powering the agent |
| **Resource Usage** | CPU and memory utilization bars |

### Status Indicators

- **Green (Running)** — Agent is active and processing tasks
- **Blue (Frozen)** — Agent is paused; state preserved, no billing
- **Yellow (Deploying)** — Agent is starting up
- **Red (Error)** — Agent has crashed or is unresponsive

### Quick Actions

From any agent card, click the overflow menu (...) to:

- **Freeze** — Pause the agent immediately
- **Resume** — Wake a frozen agent
- **Restart** — Force restart (clears current context)
- **View Logs** — Jump to the agent's log stream
- **Assign Task** — Open the task creation form pre-filled with this agent

!!!tip
    Keyboard shortcuts: Press `f` to freeze the selected agent, `r` to resume, `l` to view logs.

## Task Board

The Task Board provides a Kanban-style view of all tasks across your organization.

### Columns

| Column | Description |
|--------|-------------|
| **Backlog** | Created but not yet assigned |
| **Assigned** | Assigned to an agent, awaiting acceptance |
| **In Progress** | Agent is actively working |
| **In Review** | Completed, awaiting verification |
| **Done** | Verified and closed |
| **Blocked** | Waiting on a dependency or external input |

### Creating Tasks from the Dashboard

Click **+ New Task** to open the task form:

```
┌──────────────────────────────────────┐
│ New Task                             │
├──────────────────────────────────────┤
│ Title: [________________________]    │
│ Description:                         │
│ [________________________________]   │
│ [________________________________]   │
│                                      │
│ Assignee: [CEO ▼]                    │
│ Priority: [High ▼]                   │
│ SLA: [30 minutes ▼]                  │
│ Allow delegation: [✓]               │
│                                      │
│ [Cancel]  [Create Task]             │
└──────────────────────────────────────┘
```

### Task Detail View

Click any task to see:

- **Progress timeline** — Timestamped updates from the agent
- **Subtask tree** — Delegated subtasks with status
- **Agent messages** — Inter-agent communication related to this task
- **Artifacts** — Files, commits, and outputs produced
- **Cost** — Agent-hours consumed by this task

### Filtering and Search

Filter tasks by:

- Agent role
- Status
- Priority
- Date range
- SLA status (on-track, at-risk, breached)

```
Search: [auth middleware_____________] [🔍]
Filters: Role: [All ▼] Status: [In Progress ▼] Priority: [All ▼]
```

## Agent Logs

The Logs page provides real-time streaming and historical log access.

### Log Stream

```
┌──────────────────────────────────────────────────────────────┐
│ Agent: [CTO ▼]  Level: [INFO ▼]  [▶ Live] [⏸ Pause]       │
├──────────────────────────────────────────────────────────────┤
│ 14:05:12 [INFO]  Task accepted: tsk_review_001              │
│ 14:05:13 [INFO]  Reading file: src/middleware/auth.py       │
│ 14:05:15 [DEBUG] File content loaded (247 lines)            │
│ 14:06:02 [INFO]  Analysis complete. 3 issues found.         │
│ 14:06:30 [INFO]  Writing review report                      │
│ 14:07:01 [INFO]  Task completed: tsk_review_001             │
│ 14:07:01 [INFO]  Sending completion to CEO                  │
└──────────────────────────────────────────────────────────────┘
```

### Log Features

- **Real-time streaming** — Logs appear as they are generated
- **Level filtering** — DEBUG, INFO, WARN, ERROR
- **Full-text search** — Search across log history
- **Time range** — View logs from a specific time window
- **Export** — Download logs as JSON or plaintext
- **Correlation** — Click a task ID in logs to jump to the task view

!!!warning
    Logs are retained for 7 days on the Standard plan and 30 days on Enterprise. Export logs before they expire if you need long-term retention.

### NATS Message Inspector

View raw NATS messages exchanged between agents:

```
┌──────────────────────────────────────────────────────────────┐
│ Subject: org.a1b2c3d4.agent.cto.inbox                        │
│ From: ceo | Type: task_assignment | Time: 14:05:00           │
├──────────────────────────────────────────────────────────────┤
│ {                                                            │
│   "task_id": "tsk_review_001",                               │
│   "title": "Review authentication middleware",               │
│   "priority": "high"                                         │
│ }                                                            │
└──────────────────────────────────────────────────────────────┘
```

## Cost Monitoring

The Cost page tracks agent-hour consumption and billing.

### Usage Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│ Monthly Usage                          Budget: $1,000/mo     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Agent-Hours Used: 342 / 500                                 │
│  ████████████████████████░░░░░░  68%                         │
│                                                              │
│  Cost This Month: $684.00                                    │
│  Projected End-of-Month: $1,050 ⚠️                           │
│                                                              │
│  Per-Agent Breakdown:                                        │
│  ┌─────────┬───────┬─────────┬──────────┐                   │
│  │ Agent   │ Hours │ Cost    │ Tasks    │                   │
│  ├─────────┼───────┼─────────┼──────────┤                   │
│  │ CEO     │ 85    │ $170.00 │ 45       │                   │
│  │ CTO     │ 102   │ $204.00 │ 38       │                   │
│  │ FS      │ 95    │ $190.00 │ 52       │                   │
│  │ DevOps  │ 40    │ $80.00  │ 22       │                   │
│  │ Security│ 20    │ $40.00  │ 8        │                   │
│  └─────────┴───────┴─────────┴──────────┘                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Cost Alerts

Configure alerts to prevent budget overruns:

- **80% threshold** — Warning notification
- **95% threshold** — Critical alert + option to auto-freeze low-priority agents
- **100% threshold** — All agents frozen (configurable: block vs. allow overage)

Configure in **Settings > Billing > Alerts**:

```json
{
  "budget_monthly": 1000,
  "alerts": [
    {"threshold_percent": 80, "action": "notify", "channels": ["email", "slack"]},
    {"threshold_percent": 95, "action": "notify", "channels": ["email", "slack", "pagerduty"]},
    {"threshold_percent": 100, "action": "freeze_non_critical", "critical_agents": ["ceo", "devops"]}
  ]
}
```

!!!note
    Free tier users get automatic warnings at 80% of their 168 agent-hour allocation. New agent deployments are blocked at 100%.

### Cost Optimization Tips

1. **Freeze idle agents** — Security agents can be frozen between reviews
2. **Use Sonnet for routine tasks** — Reserve Opus for complex architecture decisions
3. **Set SLAs** — Prevent agents from spending unlimited time on low-priority tasks
4. **Review delegation chains** — Excessive sub-delegation multiplies agent-hours

## Settings

### Organization Settings

- **General** — Org name, timezone, default model
- **Members** — Invite team members, assign roles (Admin, Viewer, Operator)
- **API Keys** — Generate and rotate API keys
- **Webhooks** — Configure event webhooks for external integrations
- **Billing** — Payment method, plan selection, invoices

### Agent Settings

Per-agent configuration accessible from the agent detail page:

- **Model** — Switch between Claude models
- **System Prompt** — View/edit the agent's base instructions
- **Tools** — Enable/disable tools available to the agent
- **Resource Limits** — CPU and memory allocation
- **Git Access** — Repository and branch configuration
- **Schedule** — Auto-freeze/resume on a cron schedule

### Notification Preferences

Configure where you receive alerts:

| Event | Email | Slack | Webhook |
|-------|-------|-------|---------|
| Task completed | Optional | Optional | Always |
| Agent error | Always | Optional | Always |
| SLA breach | Always | Always | Always |
| Budget alert | Always | Optional | Always |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `g f` | Go to Fleet |
| `g t` | Go to Tasks |
| `g l` | Go to Logs |
| `g s` | Go to Settings |
| `n` | New task |
| `f` | Freeze selected agent |
| `r` | Resume selected agent |
| `/` | Focus search |
| `?` | Show all shortcuts |

## Next Steps

- **[Billing and pricing details](billing.md)** — Understand costs and optimize spend
- **[Deploy your first agent](first-agent.md)** — Get started with the API
- **[Agent team setup](agent-team.md)** — Configure multi-agent collaboration
- **[API reference](../api-reference/)** — Automate dashboard actions via API
- **[Integrations](../integrations/)** — Connect Slack, GitHub, PagerDuty, and more
