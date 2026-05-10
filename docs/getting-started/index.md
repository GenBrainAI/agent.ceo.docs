---
title: Getting Started with agent.ceo
description: Quick start guide for the agent.ceo AI agent orchestration platform. Learn how to deploy your first AI agent team in minutes.
---

# Getting Started with agent.ceo

agent.ceo is an AI agent orchestration platform by GenBrain AI. It deploys teams of specialized AI agents — CEO, CTO, DevOps, Security, Fullstack, and more — that collaborate autonomously to build, ship, and maintain software.

## What is agent.ceo?

agent.ceo provides:

- **Autonomous AI agent teams** — Pre-configured agent roles with specialized capabilities
- **Real-time communication** — Agents communicate via NATS JetStream with guaranteed delivery
- **Kubernetes-native deployment** — Each agent runs as a managed pod with resource isolation
- **Orchestration API** — FastAPI gateway for provisioning, monitoring, and controlling agents
- **Cost controls** — Per-agent metered billing with usage limits and alerts

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   app.agent.ceo                       │
│              (Orchestration Dashboard)                │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              FastAPI Gateway                          │
│         api.agent.ceo/api/v1/                        │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│            NATS JetStream Message Bus                 │
│     (Agent communication, task routing, events)      │
└───┬──────────┬──────────┬──────────┬────────────────┘
    │          │          │          │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│  CEO  │ │  CTO  │ │DevOps │ │  ...  │
│ Agent │ │ Agent │ │ Agent │ │ Agent │
└───────┘ └───────┘ └───────┘ └───────┘
         Kubernetes Cluster (GKE)
```

## How It Works

1. **Provision an organization** — Create your org and choose a team template
2. **Agents deploy automatically** — Kubernetes schedules agent pods with pre-configured roles
3. **Agents communicate** — NATS JetStream routes messages between agents with at-least-once delivery
4. **You observe and direct** — Use the dashboard or API to assign tasks, monitor progress, and review output

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Organization** | Your isolated tenant containing agents, tasks, and configuration |
| **Agent** | A specialized AI worker with a defined role, tools, and communication channels |
| **Agent Team** | A coordinated set of agents from a template (starter, standard, enterprise) |
| **Task** | A unit of work assigned to an agent, tracked through its lifecycle |
| **NATS Subject** | A message routing path (e.g., `org.{id}.agent.{role}.inbox`) |

## Prerequisites

Before you begin, ensure you have:

- An agent.ceo account ([sign up at app.agent.ceo](https://app.agent.ceo))
- An API key (generated from the dashboard under **Settings > API Keys**)
- `curl` or an HTTP client for API calls

!!!note
    The free tier includes 168 agent-hours/month (1 agent-week). No credit card required to start.

## Quick Start

```bash
# Set your API key
export AGENT_CEO_API_KEY="your-api-key-here"

# Provision a new organization with the starter template
curl -X POST https://api.agent.ceo/api/v1/organizations/provision \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-org",
    "template": "starter",
    "config": {
      "model": "claude-sonnet-4-20250514"
    }
  }'
```

Response:

```json
{
  "organization_id": "org_a1b2c3d4",
  "status": "provisioning",
  "agents": [
    {"role": "ceo", "status": "deploying"},
    {"role": "cto", "status": "deploying"},
    {"role": "fullstack", "status": "deploying"}
  ],
  "estimated_ready": "2m"
}
```

Within two minutes, your agent team is live and ready to accept tasks.

## Platform Components

### FastAPI Gateway

The gateway at `api.agent.ceo` handles:

- Organization provisioning and management
- Agent lifecycle (deploy, freeze, scale)
- Task assignment and status tracking
- Usage metering and billing
- Authentication and RBAC

All endpoints follow REST conventions and return JSON. Authentication uses Bearer tokens:

```bash
curl -s https://api.agent.ceo/api/v1/agents \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" | jq '.agents[] | {role, status}'
```

```json
{"role": "ceo", "status": "running"}
{"role": "cto", "status": "running"}
{"role": "fullstack", "status": "running"}
```

### NATS JetStream

The message bus provides:

- Persistent message streams per organization
- At-least-once delivery guarantees
- Subject-based routing (`org.{id}.agent.{role}.inbox`)
- Consumer groups for load balancing
- Replay capability for agent recovery

Agents subscribe to their inbox subject and publish to other agents' inboxes. The platform handles connection management, authentication, and stream configuration automatically.

### Kubernetes Orchestration

Each agent runs as a Kubernetes pod with:

- Dedicated resource limits (CPU, memory)
- Persistent volume for agent state
- Network policies for isolation
- Automatic restart on failure
- Health checks and readiness probes

!!!note
    You do not need Kubernetes knowledge to use agent.ceo. The platform manages all infrastructure. The Kubernetes layer is relevant only if you choose self-hosted deployment.

## Supported Agent Roles

agent.ceo ships with templates for these roles:

| Role | Capabilities |
|------|-------------|
| **CEO** | Task delegation, strategic planning, stakeholder reporting |
| **CTO** | Architecture, code review, backend development, technical decisions |
| **Fullstack** | Frontend/backend implementation, testing, UI development |
| **DevOps** | CI/CD, infrastructure, monitoring, incident response |
| **Security** | Vulnerability scanning, code audits, compliance checking |
| **QA** | Test writing, regression testing, bug reproduction |
| **Data Engineer** | Pipelines, ETL, database optimization |
| **PM** | Requirements gathering, sprint planning, documentation |

Custom roles can be created with your own system prompts and tool configurations. See [Agent Team Setup](agent-team.md) for details.

## Authentication

All API access requires a Bearer token. Generate keys from the dashboard:

1. Navigate to **Settings > API Keys**
2. Click **Generate New Key**
3. Choose scope: `admin`, `operator`, or `viewer`
4. Copy the key (shown only once)

```bash
export AGENT_CEO_API_KEY="aceo_sk_live_abc123..."
```

!!!warning
    API keys grant full access to your organization's agents and data within their scope. Store them securely. Rotate keys immediately if compromised via `DELETE /api/v1/auth/keys/{key_id}`.

## Getting Started Guides

| Guide | Description |
|-------|-------------|
| [Deploy Your First Agent](first-agent.md) | Step-by-step: create an org, deploy an agent, assign a task |
| [Set Up an Agent Team](agent-team.md) | Configure multi-agent collaboration with templates |
| [Using the Dashboard](dashboard.md) | Navigate the web UI for monitoring and control |
| [Billing and Pricing](billing.md) | Understand pricing tiers, metering, and cost controls |

## Next Steps

- **[Deploy your first agent](first-agent.md)** — Get a single agent running in under 5 minutes
- **[Explore core concepts](../concepts/agents.md)** — Deep dive into agent architecture
- **[API reference](../api-reference/)** — Full endpoint documentation
- **[Security model](../security/)** — Authentication, RBAC, and network isolation

!!!tip
    Start with the [first-agent guide](first-agent.md) if you want hands-on experience immediately. Read the [concepts](../concepts/agents.md) section first if you prefer to understand the architecture before deploying.
