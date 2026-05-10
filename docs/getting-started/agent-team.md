---
title: Set Up a Multi-Agent Team
description: Guide to deploying and configuring a multi-agent team on agent.ceo. Covers team templates, NATS communication, task delegation, and coordination patterns.
---

# Set Up a Multi-Agent Team

agent.ceo is designed for multi-agent collaboration. This guide covers deploying a coordinated team of agents that communicate, delegate tasks, and work together autonomously.

## Team Templates

agent.ceo provides pre-configured team templates that define which agents to deploy and how they interact:

| Template | Agents | Use Case |
|----------|--------|----------|
| **starter** | 3 (CEO, CTO, Fullstack) | Small projects, prototyping, solo founders |
| **standard** | 5 (CEO, CTO, Fullstack, DevOps, Security) | Production applications, growing teams |
| **enterprise** | 8+ (Standard + QA, Data, PM, Custom) | Large-scale systems, compliance-heavy orgs |

### Starter Template (3 Agents)

```yaml
# starter-template.yaml
template: starter
agents:
  - role: ceo
    description: Strategic coordination, task delegation, stakeholder communication
    tools: [task-management, communication, analytics]
    
  - role: cto
    description: Architecture decisions, code review, backend development
    tools: [git, kubectl, python, code-review]
    
  - role: fullstack
    description: Frontend/backend implementation, testing, deployment
    tools: [git, npm, docker, browser-testing]
```

### Standard Template (5 Agents)

```yaml
# standard-template.yaml
template: standard
agents:
  - role: ceo
    description: Strategic coordination, task delegation, stakeholder communication
    tools: [task-management, communication, analytics]
    
  - role: cto
    description: Architecture decisions, code review, backend development
    tools: [git, kubectl, python, code-review]
    
  - role: fullstack
    description: Frontend/backend implementation, testing, deployment
    tools: [git, npm, docker, browser-testing]
    
  - role: devops
    description: CI/CD, infrastructure, monitoring, incident response
    tools: [kubectl, terraform, docker, monitoring]
    
  - role: security
    description: Security audits, vulnerability scanning, compliance
    tools: [security-scanner, git, compliance-checks]
```

## Deploying a Team

Provision a full team with a single API call:

```bash
curl -X POST https://api.agent.ceo/api/v1/organizations/provision \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "org_a1b2c3d4",
    "template": "standard",
    "config": {
      "model": "claude-sonnet-4-20250514",
      "git_repo": "https://github.com/my-org/my-app.git",
      "git_branch": "develop",
      "nats_retention": "7d",
      "agent_overrides": {
        "cto": {
          "model": "claude-opus-4-20250514",
          "memory_limit": "8Gi"
        }
      }
    }
  }'
```

```json
{
  "provision_id": "prov_team_001",
  "status": "deploying",
  "template": "standard",
  "agents": [
    {"agent_id": "agt_ceo_001", "role": "ceo", "status": "deploying"},
    {"agent_id": "agt_cto_001", "role": "cto", "status": "deploying"},
    {"agent_id": "agt_fs_001", "role": "fullstack", "status": "deploying"},
    {"agent_id": "agt_do_001", "role": "devops", "status": "deploying"},
    {"agent_id": "agt_sec_001", "role": "security", "status": "deploying"}
  ],
  "estimated_ready": "3m"
}
```

!!!tip
    Use `agent_overrides` to give critical agents (like the CTO) more powerful models or additional resources without changing the template for everyone.

## Agent Communication via NATS

Agents communicate through NATS JetStream subjects. Each organization gets an isolated stream.

### Subject Hierarchy

```
org.{org_id}.agent.{role}.inbox     # Direct messages to an agent
org.{org_id}.agent.{role}.outbox    # Messages from an agent
org.{org_id}.tasks.assigned         # Task assignment events
org.{org_id}.tasks.completed        # Task completion events
org.{org_id}.events.broadcast       # Org-wide broadcasts
org.{org_id}.events.alerts          # System alerts (SLA, errors)
```

### Message Format

All inter-agent messages use a standard envelope:

```json
{
  "id": "msg_abc123",
  "from": "ceo",
  "to": "cto",
  "type": "task_assignment",
  "timestamp": "2026-05-10T14:00:00Z",
  "payload": {
    "task_id": "tsk_001",
    "title": "Implement rate limiting on API gateway",
    "priority": "high",
    "context": "Users are reporting 429 errors during peak hours",
    "acceptance_criteria": [
      "Rate limit of 100 req/min per API key",
      "Custom limits configurable per plan",
      "Redis-backed sliding window counter"
    ]
  },
  "reply_to": "org.a1b2c3d4.agent.ceo.inbox"
}
```

### Delivery Guarantees

NATS JetStream provides:

- **At-least-once delivery** — Messages are redelivered if not acknowledged
- **Ordered consumers** — Messages arrive in publish order per subject
- **Replay** — Agents can replay missed messages after recovery
- **Retention** — Configurable message retention (default: 7 days)

```bash
# Check NATS stream health for your org
curl -s https://api.agent.ceo/api/v1/organizations/org_a1b2c3d4/nats/status \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" | jq .
```

```json
{
  "stream": "ORG_A1B2C3D4",
  "messages": 1247,
  "bytes": 2048576,
  "consumers": 5,
  "retention_policy": "limits",
  "max_age_hours": 168,
  "subjects": [
    "org.a1b2c3d4.agent.ceo.inbox",
    "org.a1b2c3d4.agent.cto.inbox",
    "org.a1b2c3d4.agent.fullstack.inbox",
    "org.a1b2c3d4.agent.devops.inbox",
    "org.a1b2c3d4.agent.security.inbox"
  ]
}
```

## Task Delegation Patterns

### Hierarchical Delegation

The CEO agent coordinates work by delegating to specialists:

```
CEO receives high-level directive
  ├── Delegates architecture design → CTO
  ├── CTO delegates implementation → Fullstack
  ├── CTO delegates infrastructure → DevOps
  └── CEO delegates security review → Security
```

Example: CEO delegates a feature to the CTO:

```bash
curl -X POST https://api.agent.ceo/api/v1/tasks \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assignee": "agt_ceo_001",
    "title": "Build user authentication system",
    "description": "Implement JWT-based auth with OAuth2 social login support. Include rate limiting and audit logging.",
    "priority": "high",
    "sla_minutes": 120,
    "allow_delegation": true
  }'
```

With `allow_delegation: true`, the CEO agent can break this into subtasks and assign them to other agents.

### Peer-to-Peer Communication

Agents can message each other directly for clarification or coordination:

```json
{
  "from": "fullstack",
  "to": "cto",
  "type": "question",
  "payload": {
    "context": "Implementing login endpoint",
    "question": "Should JWT tokens use RS256 or HS256? What's the refresh token rotation policy?",
    "blocking_task": "tsk_impl_auth_003"
  }
}
```

### Broadcast Events

Some events go to all agents in the organization:

```json
{
  "from": "devops",
  "to": "broadcast",
  "type": "deployment_complete",
  "payload": {
    "service": "api-gateway",
    "version": "1.4.2",
    "environment": "staging",
    "sha": "abc123f"
  }
}
```

## Task Tree Structure

Complex tasks decompose into trees:

```bash
curl -s https://api.agent.ceo/api/v1/tasks/tsk_001/tree \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" | jq .
```

```json
{
  "task_id": "tsk_001",
  "title": "Build user authentication system",
  "assignee": "ceo",
  "status": "in_progress",
  "subtasks": [
    {
      "task_id": "tsk_001_a",
      "title": "Design auth architecture",
      "assignee": "cto",
      "status": "completed"
    },
    {
      "task_id": "tsk_001_b",
      "title": "Implement JWT auth middleware",
      "assignee": "fullstack",
      "status": "in_progress"
    },
    {
      "task_id": "tsk_001_c",
      "title": "Set up Redis for token storage",
      "assignee": "devops",
      "status": "completed"
    },
    {
      "task_id": "tsk_001_d",
      "title": "Security review of auth flow",
      "assignee": "security",
      "status": "pending",
      "blocked_by": ["tsk_001_b"]
    }
  ]
}
```

!!!note
    Tasks can declare dependencies via `blocked_by`. Blocked tasks are not assigned until their dependencies complete.

## Team Configuration

### Custom Agent Roles

Add custom agents beyond the template:

```bash
curl -X POST https://api.agent.ceo/api/v1/agents \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "org_a1b2c3d4",
    "role": "data-engineer",
    "template": "tmpl_custom",
    "config": {
      "model": "claude-sonnet-4-20250514",
      "system_prompt": "You are a data engineering specialist...",
      "tools": ["python", "sql", "spark", "airflow"],
      "nats_subscriptions": [
        "org.a1b2c3d4.agent.data-engineer.inbox",
        "org.a1b2c3d4.events.data-pipeline"
      ]
    }
  }'
```

### Communication Policies

Control which agents can communicate:

```bash
curl -X PUT https://api.agent.ceo/api/v1/organizations/org_a1b2c3d4/policies/communication \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "hierarchical",
    "rules": [
      {"from": "ceo", "to": "*", "allow": true},
      {"from": "cto", "to": ["fullstack", "devops"], "allow": true},
      {"from": "fullstack", "to": ["cto"], "allow": true},
      {"from": "*", "to": "security", "allow": true}
    ]
  }'
```

!!!warning
    In `hierarchical` mode, agents can only message their direct reports and managers. Use `open` mode for unrestricted peer-to-peer communication (default for starter template).

### SLA Configuration

Set performance expectations per agent or role:

```bash
curl -X PUT https://api.agent.ceo/api/v1/organizations/org_a1b2c3d4/sla \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "defaults": {
      "task_acceptance_seconds": 30,
      "progress_update_interval_minutes": 5,
      "max_task_duration_minutes": 60
    },
    "overrides": {
      "security": {
        "max_task_duration_minutes": 120
      }
    },
    "alerts": {
      "channels": ["webhook", "email"],
      "webhook_url": "https://hooks.slack.com/services/xxx"
    }
  }'
```

## Scaling Your Team

### Adding Agents

Scale a role horizontally for parallel workloads:

```bash
curl -X POST https://api.agent.ceo/api/v1/organizations/org_a1b2c3d4/scale \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "fullstack",
    "replicas": 3,
    "load_balancing": "round_robin"
  }'
```

### Removing Agents

```bash
curl -X DELETE https://api.agent.ceo/api/v1/agents/agt_fs_002 \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY"
```

!!!note
    Removing an agent reassigns its pending tasks to other agents with the same role, or escalates to the manager if no peers exist.

## Next Steps

- **[Using the Dashboard](dashboard.md)** — Monitor your team through the web UI
- **[Billing and Pricing](billing.md)** — Understand per-agent costs as your team grows
- **[Deployment guide](../deployment/)** — Self-hosted deployment options
- **[NATS deep dive](../concepts/agents.md)** — Advanced messaging patterns and configuration
- **[Security model](../security/)** — Inter-agent isolation and access controls
