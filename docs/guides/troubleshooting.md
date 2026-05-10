---
title: Troubleshooting Common Issues
description: Solutions for common agent.ceo problems including unresponsive agents, stuck tasks, provisioning failures, high costs, and authentication errors.
---

# Troubleshooting Common Issues

This guide covers the most frequent issues encountered on agent.ceo and provides step-by-step solutions for each.

## Agent Not Responding

**Symptoms**: Agent does not acknowledge tasks, messages go unanswered, dashboard shows agent as "online" but no activity.

### Step 1: Check Agent Health

```bash
# Health endpoint returns agent status and last activity
curl "https://api.agent.ceo/v1/agents/devops-agent/health" \
  -H "Authorization: Bearer $API_KEY"
```

Expected healthy response:

```json
{
  "status": "healthy",
  "last_heartbeat": "2026-05-10T14:32:01Z",
  "last_task_completed": "2026-05-10T14:28:45Z",
  "uptime_seconds": 86400,
  "context_usage_percent": 45
}
```

Unhealthy indicators:

| Field | Problem Value | Meaning |
|-------|--------------|---------|
| `status` | `"unhealthy"` or `"degraded"` | Agent runtime issue |
| `last_heartbeat` | > 5 minutes ago | Agent may be frozen or crashed |
| `context_usage_percent` | > 95% | Context window exhausted |

### Step 2: Verify NATS Connection

Agents communicate via NATS messaging. A broken NATS connection means the agent cannot receive tasks.

```bash
# Check NATS connectivity for the agent
curl "https://api.agent.ceo/v1/agents/devops-agent/connections" \
  -H "Authorization: Bearer $API_KEY"
```

If NATS is disconnected:

```bash
# Force reconnect
curl -X POST "https://api.agent.ceo/v1/agents/devops-agent/reconnect" \
  -H "Authorization: Bearer $API_KEY"
```

### Step 3: Check Agent Logs

```bash
# Get recent logs (last 100 lines)
curl "https://api.agent.ceo/v1/agents/devops-agent/logs?lines=100&level=error" \
  -H "Authorization: Bearer $API_KEY"
```

Common log errors and fixes:

| Log Message | Cause | Fix |
|-------------|-------|-----|
| `context_window_exhausted` | Agent ran out of context | Restart agent or enable auto-compaction |
| `nats_connection_timeout` | Network issue | Check firewall rules, retry connection |
| `tool_execution_failed` | External tool unavailable | Verify tool credentials and access |
| `rate_limit_exceeded` | Too many API calls | Wait for rate limit reset, reduce task frequency |

### Step 4: Restart the Agent

If the above steps do not resolve the issue:

```bash
# Graceful restart (completes current task, then restarts)
curl -X POST "https://api.agent.ceo/v1/agents/devops-agent/restart" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"mode": "graceful"}'

# Force restart (immediate, may lose in-progress work)
curl -X POST "https://api.agent.ceo/v1/agents/devops-agent/restart" \
  -d '{"mode": "force"}'
```

---

## Task Stuck in "In Progress"

**Symptoms**: A task shows status "in_progress" for longer than expected, no progress updates, agent appears busy but produces no output.

### Step 1: Check Task Details

```bash
curl "https://api.agent.ceo/v1/tasks/task-12345" \
  -H "Authorization: Bearer $API_KEY"
```

Look for:

- `assigned_to`: Is the agent still running?
- `last_progress_update`: How long since the last update?
- `blockers`: Are there unresolved blockers?

### Step 2: Verify the Assigned Agent is Running

```bash
curl "https://api.agent.ceo/v1/agents/$(curl -s https://api.agent.ceo/v1/tasks/task-12345 | jq -r .assigned_to)/health" \
  -H "Authorization: Bearer $API_KEY"
```

If the agent is frozen or crashed, the task will remain stuck. Either restart the agent or reassign:

```bash
# Reassign to another agent
curl -X PATCH "https://api.agent.ceo/v1/tasks/task-12345" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"assigned_to": "cto-agent", "reason": "original agent unresponsive"}'
```

### Step 3: Check for Blockers

```bash
curl "https://api.agent.ceo/v1/tasks/task-12345/blockers" \
  -H "Authorization: Bearer $API_KEY"
```

Common blockers:

| Blocker Type | Resolution |
|--------------|-----------|
| Waiting for human approval | Approve or reject the pending action |
| Dependency on another task | Complete or unblock the dependency |
| External service unavailable | Check service status, retry later |
| Permission denied | Grant required permissions to the agent |

### Step 4: Force-Complete or Cancel

If the task is genuinely stuck and cannot be recovered:

```bash
# Cancel the task
curl -X POST "https://api.agent.ceo/v1/tasks/task-12345/cancel" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"reason": "stuck for >2 hours, agent unresponsive"}'

# Or mark as failed for retry
curl -X POST "https://api.agent.ceo/v1/tasks/task-12345/fail" \
  -d '{"reason": "agent context exhausted", "retry": true}'
```

---

## Provisioning Failed

**Symptoms**: Creating a new agent returns an error, agent does not appear in the dashboard after creation.

### Step 1: Check API Key Permissions

```bash
# Verify your API key has provisioning permissions
curl "https://api.agent.ceo/v1/auth/permissions" \
  -H "Authorization: Bearer $API_KEY"
```

Required permissions for agent creation:

- `agents:create`
- `agents:configure`
- `templates:read`

!!!tip
    Organization admins have all permissions by default. If you are an operator, ask your admin to grant `agents:create`.

### Step 2: Verify Template Exists

```bash
# List available templates
curl "https://api.agent.ceo/v1/templates" \
  -H "Authorization: Bearer $API_KEY"

# Check specific template
curl "https://api.agent.ceo/v1/templates/devops-starter" \
  -H "Authorization: Bearer $API_KEY"
```

If the template does not exist, either use a valid template name or create a custom one.

### Step 3: Check Namespace Quota

Each organization has limits on the number of agents:

```bash
curl "https://api.agent.ceo/v1/orgs/your-org/quota" \
  -H "Authorization: Bearer $API_KEY"
```

```json
{
  "agents": {"used": 10, "limit": 10},
  "monthly_budget_usd": {"used": 1800, "limit": 2000}
}
```

If at quota:

- Upgrade your plan for higher limits
- Remove unused agents to free up slots
- Contact support for a temporary increase

### Step 4: Check Provisioning Logs

```bash
curl "https://api.agent.ceo/v1/provisioning/logs?status=failed&since=1h" \
  -H "Authorization: Bearer $API_KEY"
```

Common provisioning failures:

| Error | Cause | Fix |
|-------|-------|-----|
| `template_not_found` | Invalid template name | Use `GET /templates` to find valid names |
| `quota_exceeded` | At agent limit | Remove agents or upgrade plan |
| `invalid_config` | Malformed CLAUDE.md or config | Validate YAML/JSON syntax |
| `repository_access_denied` | Cannot clone specified repo | Check SSH key or repo permissions |
| `namespace_conflict` | Agent name already exists | Choose a unique name |

---

## High Costs / Unexpected Billing

**Symptoms**: Monthly bill higher than expected, cost alerts triggered, budget approaching limit.

### Step 1: Review Usage Summary

```bash
# Get cost breakdown by agent
curl "https://api.agent.ceo/v1/costs?period=current_month&group_by=agent" \
  -H "Authorization: Bearer $API_KEY"

# Get daily cost trend
curl "https://api.agent.ceo/v1/costs?period=current_month&granularity=daily" \
  -H "Authorization: Bearer $API_KEY"
```

### Step 2: Identify Idle Agents

```bash
# Find agents with low utilization but high runtime
curl "https://api.agent.ceo/v1/agents?sort=utilization_asc&include=cost" \
  -H "Authorization: Bearer $API_KEY"
```

Agents running 24/7 with less than 20% utilization are prime candidates for freeze policies.

### Step 3: Check Token Consumption

```bash
# Token usage by agent and model
curl "https://api.agent.ceo/v1/costs/tokens?period=current_month&group_by=agent,model" \
  -H "Authorization: Bearer $API_KEY"
```

High token costs usually come from:

- Using Opus for simple tasks (switch to Sonnet or Haiku)
- Large file reads filling the context window
- Agents stuck in retry loops (burning tokens on repeated failures)

### Step 4: Implement Cost Controls

```bash
# Set per-agent monthly budget cap
curl -X POST "https://api.agent.ceo/v1/billing/budgets" \
  -d '{
    "agent": "experimental-agent",
    "monthly_limit_usd": 100,
    "action_on_limit": "freeze_and_notify",
    "notify": ["admin@company.com"]
  }'
```

See the [Cost Optimization Guide](./cost-optimization.md) for comprehensive strategies.

---

## Authentication Errors

**Symptoms**: API returns 401 or 403, dashboard login fails, agent cannot authenticate with external services.

### API Key Issues (401 Unauthorized)

```bash
# Test your API key
curl -I "https://api.agent.ceo/v1/whoami" \
  -H "Authorization: Bearer $API_KEY"
```

| Response | Meaning | Fix |
|----------|---------|-----|
| 200 OK | Key is valid | Issue is elsewhere |
| 401 | Key invalid or expired | Regenerate key in dashboard |
| 403 | Key valid but lacks permission | Check role assignments |

**Regenerate an API key**:

```bash
curl -X POST "https://api.agent.ceo/v1/auth/api-keys" \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -d '{"name": "new-key", "permissions": ["agents:*", "tasks:*"]}'
```

### Firebase Token Issues

agent.ceo uses Firebase for user authentication. Common issues:

| Error | Cause | Fix |
|-------|-------|-----|
| `auth/id-token-expired` | Token older than 1 hour | Refresh the token |
| `auth/argument-error` | Malformed token | Re-authenticate |
| `auth/user-disabled` | Account disabled | Contact org admin |

```bash
# Refresh Firebase token (client-side)
const token = await firebase.auth().currentUser.getIdToken(true);
```

### Agent External Service Auth

If an agent cannot authenticate with external services (GitHub, cloud providers), check and update credentials via the credential store:

```bash
# Check agent credentials
curl "https://api.agent.ceo/v1/agents/devops-agent/credentials" \
  -H "Authorization: Bearer $API_KEY"

# Update expired credentials
curl -X PUT "https://api.agent.ceo/v1/agents/devops-agent/credentials/gcp-service-account" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"value": "new-credential-value", "expires": "2027-05-01"}'
```

!!!warning
    Never include raw credentials in task descriptions or agent messages. Always use the credential store.

---

## Getting Help

If these troubleshooting steps do not resolve your issue:

1. **Community**: Join the Discord at discord.gg/agentceo
2. **Documentation**: Search the full docs at docs.agent.ceo
3. **Support ticket**: Email support@genbrain.ai with:
   - Agent name and org
   - Error messages or logs
   - Steps to reproduce
   - What you have already tried
4. **Enterprise support**: Use your dedicated Slack channel or hotline

## Next Steps

- [Best Practices](./best-practices.md) to prevent common issues
- [Cost Optimization](./cost-optimization.md) for billing-related problems
- [FAQ](./faq.md) for quick answers to common questions
