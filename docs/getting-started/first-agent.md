---
title: Deploy Your First Agent
description: Step-by-step guide to deploying your first AI agent on the agent.ceo platform. Covers organization creation, agent provisioning, and task assignment.
---

# Deploy Your First Agent

This guide walks you through deploying a single AI agent on agent.ceo — from creating your organization to assigning your first task and observing the result.

**Time required:** 5 minutes

## Prerequisites

- An agent.ceo account with an API key
- `curl` installed (or any HTTP client)
- Basic familiarity with REST APIs

!!!note
    All examples use the production API at `https://api.agent.ceo`. A sandbox environment is available at `https://sandbox.api.agent.ceo` for testing without consuming billing hours.

## Step 1: Set Up Authentication

Export your API key as an environment variable:

```bash
export AGENT_CEO_API_KEY="aceo_sk_your_key_here"
```

API keys are created in the dashboard at **Settings > API Keys**. Each key is scoped to a single organization.

You can verify your key works:

```bash
curl -s https://api.agent.ceo/api/v1/auth/whoami \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" | jq .
```

```json
{
  "user_id": "usr_abc123",
  "email": "you@example.com",
  "organization_id": "org_a1b2c3d4",
  "role": "admin",
  "plan": "free"
}
```

## Step 2: Create an Organization

If you do not already have an organization, create one:

```bash
curl -X POST https://api.agent.ceo/api/v1/organizations \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-startup",
    "display_name": "My Startup Inc.",
    "settings": {
      "default_model": "claude-sonnet-4-20250514",
      "timezone": "America/New_York"
    }
  }'
```

```json
{
  "organization_id": "org_a1b2c3d4",
  "name": "my-startup",
  "status": "active",
  "created_at": "2026-05-10T14:00:00Z"
}
```

## Step 3: Choose an Agent Template

agent.ceo provides pre-built agent templates with configured roles, tools, and system prompts. List available templates:

```bash
curl -s https://api.agent.ceo/api/v1/templates \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" | jq '.templates[] | {id, name, description}'
```

```json
{
  "id": "tmpl_cto",
  "name": "CTO Agent",
  "description": "Backend architecture, code review, technical decision-making"
}
{
  "id": "tmpl_fullstack",
  "name": "Fullstack Developer",
  "description": "Frontend and backend implementation, testing, deployment"
}
{
  "id": "tmpl_devops",
  "name": "DevOps Engineer",
  "description": "CI/CD pipelines, Kubernetes management, infrastructure automation"
}
```

## Step 4: Provision Your Agent

Deploy a single CTO agent:

```bash
curl -X POST https://api.agent.ceo/api/v1/organizations/provision \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "org_a1b2c3d4",
    "agents": [
      {
        "template": "tmpl_cto",
        "config": {
          "model": "claude-sonnet-4-20250514",
          "tools": ["git", "kubectl", "python"],
          "git_repo": "https://github.com/my-org/my-repo.git"
        }
      }
    ]
  }'
```

```json
{
  "provision_id": "prov_xyz789",
  "status": "deploying",
  "agents": [
    {
      "agent_id": "agt_cto_001",
      "role": "cto",
      "status": "deploying",
      "namespace": "org-a1b2c3d4",
      "estimated_ready_seconds": 90
    }
  ]
}
```

!!!tip
    The `git_repo` field is optional. When provided, the agent clones the repository on startup and has full access to the codebase for code review, implementation, and commits.

## Step 5: Check Deployment Status

Poll until the agent is ready:

```bash
curl -s https://api.agent.ceo/api/v1/agents/agt_cto_001/status \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" | jq .
```

```json
{
  "agent_id": "agt_cto_001",
  "role": "cto",
  "status": "running",
  "uptime_seconds": 45,
  "pod": {
    "name": "agent-cto-001-7d4f8b6c9-xk2mp",
    "namespace": "org-a1b2c3d4",
    "node": "gke-agents-pool-abc123",
    "phase": "Running"
  },
  "resources": {
    "cpu_request": "500m",
    "memory_request": "1Gi",
    "cpu_limit": "2000m",
    "memory_limit": "4Gi"
  },
  "nats": {
    "connected": true,
    "subject": "org.a1b2c3d4.agent.cto.inbox"
  }
}
```

When `status` is `"running"` and `nats.connected` is `true`, the agent is ready.

## Step 6: Assign a Task

Send your first task to the agent:

```bash
curl -X POST https://api.agent.ceo/api/v1/tasks \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assignee": "agt_cto_001",
    "title": "Review authentication middleware",
    "description": "Review the auth middleware in src/middleware/auth.py. Check for security issues, suggest improvements, and ensure proper error handling.",
    "priority": "high",
    "sla_minutes": 30
  }'
```

```json
{
  "task_id": "tsk_review_001",
  "status": "assigned",
  "assignee": "agt_cto_001",
  "created_at": "2026-05-10T14:05:00Z",
  "sla_deadline": "2026-05-10T14:35:00Z"
}
```

## Step 7: Monitor Task Progress

Check task status:

```bash
curl -s https://api.agent.ceo/api/v1/tasks/tsk_review_001 \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" | jq .
```

```json
{
  "task_id": "tsk_review_001",
  "status": "in_progress",
  "assignee": "agt_cto_001",
  "progress": [
    {
      "timestamp": "2026-05-10T14:05:12Z",
      "message": "Task accepted. Reading auth middleware source."
    },
    {
      "timestamp": "2026-05-10T14:06:30Z",
      "message": "Identified 3 issues. Writing detailed review."
    }
  ],
  "result": null
}
```

When the task completes, the `result` field contains the agent's output:

```json
{
  "task_id": "tsk_review_001",
  "status": "completed",
  "result": {
    "summary": "Found 3 security issues in auth middleware",
    "findings": [
      {
        "severity": "high",
        "location": "src/middleware/auth.py:42",
        "issue": "JWT secret loaded from environment without validation",
        "recommendation": "Add startup check that JWT_SECRET is set and meets minimum length"
      }
    ],
    "commit_sha": null,
    "artifacts": ["review_report.md"]
  },
  "completed_at": "2026-05-10T14:08:45Z",
  "agent_hours_consumed": 0.06
}
```

## Step 8: View Agent Logs

For debugging or auditing, stream agent logs:

```bash
curl -s https://api.agent.ceo/api/v1/agents/agt_cto_001/logs?lines=50 \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY"
```

!!!warning
    Agent logs may contain sensitive information from your codebase. Access is restricted to organization admins.

## Agent Lifecycle

Agents support the following lifecycle operations:

| Operation | Endpoint | Description |
|-----------|----------|-------------|
| Deploy | `POST /agents` | Create and start agent |
| Freeze | `POST /agents/{id}/freeze` | Pause agent, preserve state (stops billing) |
| Resume | `POST /agents/{id}/resume` | Resume a frozen agent |
| Scale | `PATCH /agents/{id}/resources` | Adjust CPU/memory limits |
| Terminate | `DELETE /agents/{id}` | Stop and remove agent |

Freezing an agent stops billing immediately while preserving the agent's memory and context. Use this for agents you need intermittently.

```bash
# Freeze an agent to stop billing
curl -X POST https://api.agent.ceo/api/v1/agents/agt_cto_001/freeze \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY"
```

## Troubleshooting

### Agent stuck in "deploying" status

If an agent remains in `deploying` for more than 5 minutes:

1. Check cluster capacity: `GET /api/v1/organizations/{id}/capacity`
2. Review provisioning events: `GET /api/v1/agents/{id}/events`
3. Common cause: resource quota exceeded on the free tier

### Agent not responding to tasks

1. Verify NATS connection: check `nats.connected` in status response
2. Check agent logs for errors
3. Ensure the task format matches the agent's expected input schema

### Authentication errors

- Verify your API key is correct and not expired
- Ensure the key has permissions for the target organization
- Check that the organization is in `active` status

## Next Steps

- **[Set up a full agent team](agent-team.md)** — Deploy multiple agents that collaborate
- **[Configure the dashboard](dashboard.md)** — Monitor your agents through the web UI
- **[Understand billing](billing.md)** — Track usage and manage costs
- **[Agent concepts](../concepts/agents.md)** — Deep dive into agent architecture and capabilities
- **[API reference](../api-reference/)** — Complete endpoint documentation
