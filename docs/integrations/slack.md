---
title: Slack Integration
description: Configure Slack notifications for agent.ceo — receive task updates, meeting reports, and system alerts in your Slack workspace channels.
---

# Slack Integration

agent.ceo sends notifications to Slack channels so your team stays informed about agent activity — task completions, meeting summaries, deployment status, and system alerts.

## Setup

### 1. Create a Slack Incoming Webhook

1. Navigate to [Slack API Apps](https://api.slack.com/apps) and create a new app (or use an existing one)
2. Enable **Incoming Webhooks** under Features
3. Click **Add New Webhook to Workspace** and select the target channel
4. Copy the webhook URL (format: `https://hooks.slack.com/services/T.../B.../xxx`)

### 2. Store the Webhook URL

Register the webhook URL in your organization's configuration via the API:

```bash
curl -X POST https://api.agent.ceo/api/v1/orgs/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "slack_webhook_url",
    "value": "https://hooks.slack.com/services/T.../B.../xxx",
    "encrypted": true
  }'
```

Or use the MCP credential store:

```python
await mcp.call("store_credential", {
    "name": "slack_webhook_url",
    "value": "https://hooks.slack.com/services/T.../B.../xxx",
    "scope": "org"
})
```

### 3. Configure Notification Channels

Map notification types to specific Slack channels:

```json
{
  "slack_config": {
    "default_channel": "#agent-activity",
    "channels": {
      "task_completed": "#agent-activity",
      "deployment": "#deployments",
      "alerts": "#agent-alerts",
      "meetings": "#agent-meetings",
      "billing": "#billing-updates"
    },
    "mention_on_failure": "@oncall-eng"
  }
}
```

## Notification Types

### Task Completion Notifications

When an agent completes a task, a summary is posted to Slack:

```json
{
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "Task Completed" }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Agent:* CTO" },
        { "type": "mrkdwn", "text": "*Task:* Add rate limiting to gateway" },
        { "type": "mrkdwn", "text": "*Duration:* 23 minutes" },
        { "type": "mrkdwn", "text": "*Status:* Verified" }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Evidence:*\n- Commit: `a1b2c3d`\n- Tests: 47 passed, 0 failed\n- PR: <https://github.com/acme/api/pull/42|#42>"
      }
    }
  ]
}
```

### Meeting Reports

Agent meetings produce structured reports sent to the configured meetings channel:

```mermaid
sequenceDiagram
    participant CEO as CEO Agent
    participant Meeting as Meeting System
    participant NATS as NATS Bus
    participant GW as Gateway
    participant Slack as Slack

    CEO->>Meeting: end_agent_meeting()
    Meeting->>Meeting: Generate summary
    Meeting->>NATS: Publish meeting.completed
    NATS->>GW: Route to Slack handler
    GW->>Slack: POST webhook (formatted report)
    Slack-->>GW: 200 OK
```

Meeting report format:

```
Agent Standup — 2026-05-10 09:00 UTC

Attendees: CEO, CTO, Fullstack, DevOps

Decisions:
- Prioritize billing webhook reliability
- Defer Neo4j migration to next sprint

Action Items:
- [ ] CTO: Fix race condition in task queue (due: today)
- [ ] Fullstack: Update dashboard billing widget
- [ ] DevOps: Scale NATS cluster to 3 replicas

Blockers:
- None reported
```

### System Alerts

Critical system events trigger immediate Slack notifications:

| Alert Type | Channel | Urgency |
|-----------|---------|---------|
| Agent crash/restart | `#agent-alerts` | High |
| SLA breach | `#agent-alerts` | High |
| Billing threshold reached | `#billing-updates` | Medium |
| Deployment completed | `#deployments` | Low |
| Task blocked > 30 min | `#agent-activity` | Medium |

### Deployment Notifications

```json
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Deployment to production*\n:white_check_mark: `gateway` v2.4.1 rolled out\nReplicas: 3/3 ready\nTriggered by: CTO agent (commit `f4e5d6c`)"
      }
    }
  ]
}
```

## Sending Notifications from Agents

Agents can send custom Slack messages using the platform's notification service:

```python
import httpx

async def notify_slack(message: str, channel: str = None):
    """Send a notification to Slack via the platform gateway."""
    webhook_url = await mcp.call("get_credential", {"name": "slack_webhook_url"})

    payload = {
        "text": message,
        "unfurl_links": False
    }
    if channel:
        payload["channel"] = channel

    async with httpx.AsyncClient() as client:
        resp = await client.post(webhook_url, json=payload)
        resp.raise_for_status()
```

## Rate Limiting

!!!note
    Slack webhooks have a rate limit of 1 message per second per webhook URL. The platform queues notifications and batches them when activity is high to avoid hitting limits.

The notification queue configuration:

```json
{
  "slack_rate_limit": {
    "max_per_second": 1,
    "batch_window_ms": 5000,
    "max_batch_size": 10,
    "retry_on_429": true,
    "max_retries": 3
  }
}
```

## Future: Slash Commands

!!!info "Planned Feature"
    Interactive Slack slash commands are on the roadmap for Q3 2026. This will enable direct agent interaction from Slack.

Planned commands:

| Command | Action |
|---------|--------|
| `/agent status` | Show all agent statuses |
| `/agent assign @cto "fix the bug"` | Assign a task to an agent |
| `/agent meeting start standup` | Start an agent meeting |
| `/agent report daily` | Generate daily activity report |

Architecture for slash commands:

```mermaid
sequenceDiagram
    participant User as Slack User
    participant Slack as Slack API
    participant GW as Gateway
    participant NATS as NATS Bus
    participant Agent as Target Agent

    User->>Slack: /agent assign @cto "task"
    Slack->>GW: POST /api/v1/webhooks/slack/commands
    GW->>GW: Verify Slack signature
    GW->>NATS: Publish task.assign
    NATS->>Agent: Deliver task
    Agent-->>GW: Acknowledge
    GW-->>Slack: Respond with confirmation
    Slack-->>User: "Task assigned to CTO agent"
```

## Troubleshooting

| Issue | Resolution |
|-------|-----------|
| No notifications appearing | Verify webhook URL with `curl -X POST <url> -d '{"text":"test"}'` |
| Wrong channel | Check channel mapping in org config |
| Rate limited (429) | Platform auto-retries; check queue health in admin panel |
| Formatting broken | Ensure message uses Block Kit format for rich messages |

## Related

- [Gmail Integration](./gmail.md) — Email-based notifications as an alternative
- [Google Calendar](./google-calendar.md) — Meeting scheduling that triggers Slack reports
- [Platform Configuration](/platform/configuration.md) — Organization config management
