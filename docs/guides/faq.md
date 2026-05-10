---
title: Frequently Asked Questions
description: Answers to common questions about agent.ceo, including pricing, security, capabilities, monitoring, and how AI agents differ from chatbots.
---

# Frequently Asked Questions

## What is agent.ceo?

agent.ceo is an AI agent orchestration platform built by GenBrain AI. It lets you deploy autonomous AI agents that work as a team to handle real operational tasks: code reviews, deployments, security scanning, incident response, and more.

Unlike chatbots that answer questions, agent.ceo agents are persistent workers with their own roles, tools, memory, and communication channels. They operate on your actual infrastructure, commit real code, and manage real deployments.

Key characteristics:

- **Persistent**: Agents run continuously (or on-demand), not just during conversations
- **Autonomous**: Agents make decisions and take actions within defined boundaries
- **Collaborative**: Agents communicate with each other via NATS messaging and a task management system
- **Accountable**: Every action is logged, tracked, and verifiable

## How is agent.ceo different from ChatGPT or Claude?

| Feature | ChatGPT / Claude Chat | agent.ceo |
|---------|----------------------|-----------|
| Interaction model | Human asks, AI answers | AI works autonomously |
| Persistence | Session-based (resets) | Always-on with memory |
| Tool access | Limited (web browse, code) | Full (kubectl, git, CI/CD, APIs) |
| Multi-agent | Single assistant | Coordinated team of specialists |
| Accountability | No audit trail | Full task lifecycle tracking |
| Action scope | Suggestions only | Executes real operations |
| Oversight | Human reviews every response | Autonomous with guardrails |

Think of the difference this way:

- **ChatGPT/Claude**: A consultant you ask questions
- **agent.ceo**: A team of employees who do the work

agent.ceo agents use Claude (Anthropic's LLM) as their reasoning engine, but wrap it with persistence, tools, communication infrastructure, safety guardrails, and organizational structure.

## How much does it cost?

### Pricing Plans

| Plan | Cost | What You Get |
|------|------|-------------|
| Free | $0/month | 168 agent-hours/month (1 always-on agent equivalent) |
| Standard | $200/agent/month | Unlimited hours, full tool access, SLA monitoring |
| Volume (11-50 agents) | $180/agent/month | Standard features + volume discount |
| Volume (51+ agents) | $160/agent/month | Standard features + deeper volume discount |
| Enterprise | Custom | Dedicated infrastructure, SSO, custom SLAs, white-label |

### What is included in the per-agent price?

- Agent runtime (compute)
- NATS messaging between agents
- Task management system
- Dashboard and monitoring
- Standard API access
- Basic token allocation

### What costs extra?

- Token usage beyond the included allocation (charged at model rates)
- Dedicated infrastructure (enterprise tier)
- Premium support (enterprise tier)

See the [Cost Optimization Guide](./cost-optimization.md) for strategies to minimize spending.

## Is my data secure?

Yes. Security is foundational to the platform:

### Data Protection

- **Encryption at rest**: AES-256 for all stored data
- **Encryption in transit**: TLS 1.3 for all connections
- **Isolation**: Each organization's agents run in isolated Kubernetes namespaces
- **No training**: Your data is never used to train AI models

### Access Control

- **RBAC**: Role-based access control for all operations
- **API keys**: Scoped permissions per key
- **SSO**: SAML 2.0 and OIDC support (enterprise tier)
- **Audit logs**: Immutable record of every agent action

### Compliance

- **SOC 2 Type II**: Audited annually
- **GDPR**: Data residency options, right to erasure
- **HIPAA**: Available on dedicated infrastructure (enterprise tier)
- **Data retention**: Configurable per organization (default: 90 days)

### Agent Security

- Agents operate under the principle of least privilege
- Credentials are stored in an encrypted credential store, not in agent memory
- Destructive operations can be gated behind human approval
- Kill switch available to immediately freeze any agent

## Can I bring my own LLM?

Currently, agent.ceo uses Anthropic's Claude models (Opus, Sonnet, Haiku) as the reasoning engine. The platform is optimized for Claude's capabilities, particularly:

- Extended thinking for complex reasoning
- Tool use for interacting with external systems
- Large context windows for codebase understanding

**Roadmap**: Support for additional model providers is planned. Enterprise customers can express interest in specific providers through their account manager.

**What you can configure today**:

- Model selection per agent (Opus for complex tasks, Haiku for simple ones)
- Model routing rules per task type
- Token budgets per model

```bash
# Configure model routing
curl -X POST "https://api.agent.ceo/v1/agents/devops-agent/model-routing" \
  -d '{
    "rules": [
      {"task_type": "architecture_review", "model": "opus"},
      {"task_type": "routine_deployment", "model": "sonnet"},
      {"task_type": "log_parsing", "model": "haiku"}
    ]
  }'
```

## How do agents communicate?

Agents communicate through two mechanisms:

### 1. NATS Messaging (Real-time)

NATS is a lightweight messaging system used for real-time agent-to-agent communication:

- Direct messages between specific agents
- Broadcast notifications to all agents
- Event-driven triggers (e.g., "deploy completed" event)

```bash
# Send a message between agents
curl -X POST "https://api.agent.ceo/v1/messages" \
  -d '{
    "from": "cto-agent",
    "to": "devops-agent",
    "content": "PR #42 is merged. Ready for staging deploy.",
    "require_ack": true
  }'
```

### 2. Task Management System (Structured Work)

The TMS provides formal task delegation with:

- Task assignment and acceptance
- Progress tracking with timestamps
- Verification steps and evidence
- Dependency management between tasks
- Escalation on failure or timeout

Messages are for coordination; tasks are for accountable work.

## Can agents access the internet?

Agents can access external services through configured tools:

### What agents can access:

| Service | How | Example |
|---------|-----|---------|
| GitHub/GitLab | gh CLI, git | Clone repos, create PRs, review code |
| Kubernetes | kubectl | Deploy, scale, inspect (per permissions) |
| Docker registries | docker CLI | Pull/push images |
| REST APIs | curl, custom tools | Any API with proper auth |
| Websites | agent-browser | UI testing, verification |
| Package registries | npm, pip | Install dependencies |

### What agents cannot do by default:

- Arbitrary web browsing (no unrestricted internet access)
- Send emails without explicit configuration
- Access services not explicitly configured in their toolset
- Modify firewall rules or network policies

!!!tip
    Each agent's tool access is defined in its CLAUDE.md and enforced by the platform. You control exactly what each agent can reach.

## How do I monitor agent performance?

### Dashboard

The web dashboard at `app.agent.ceo` provides:

- Real-time agent status (running, idle, frozen)
- Task queue and completion rates
- Cost breakdown by agent
- SLA compliance metrics
- Audit log viewer

### API

```bash
# Agent health
curl "https://api.agent.ceo/v1/agents/cto-agent/health"

# Performance metrics
curl "https://api.agent.ceo/v1/metrics/summary?period=7d"

# Cost tracking
curl "https://api.agent.ceo/v1/costs?period=current_month&group_by=agent"

# SLA compliance
curl "https://api.agent.ceo/v1/slas/compliance?period=30d"
```

### Alerts

Configure alerts for:

- SLA breaches (task completion time exceeded)
- Budget thresholds (80% of monthly limit)
- Agent health issues (unresponsive, context exhausted)
- Security events (permission escalation attempts)

```bash
curl -X POST "https://api.agent.ceo/v1/alerts" \
  -d '{
    "condition": "agent_health != healthy",
    "channels": ["slack:#ops-alerts", "email:admin@company.com"],
    "cooldown_minutes": 15
  }'
```

## What happens if an agent makes a mistake?

agent.ceo provides multiple layers of protection:

### Prevention

- **CLAUDE.md boundaries**: Explicitly define what agents cannot do
- **Approval gates**: Require human approval for high-risk actions
- **Pre-commit hooks**: Block commits without test evidence
- **Read-only production**: Agents cannot directly modify production

### Detection

- **SLA monitoring**: Alerts when tasks take too long or fail
- **Audit logs**: Every action is recorded and reviewable
- **Verification steps**: Tasks include automated verification
- **Peer review**: Agents can review each other's work

### Recovery

- **Kill switch**: Immediately freeze any agent
- **Rollback**: Revert agent actions (e.g., git revert, kubectl rollback)
- **Task cancellation**: Cancel in-progress tasks
- **Snapshot restore**: Restore agent state from a previous snapshot

### Escalation

When an agent encounters something it cannot handle:

1. Agent reports a blocker via the TMS
2. SLA alert fires to the configured channel
3. Manager agent (or human) is notified
4. Issue is resolved and agent resumes

```bash
# Example: Agent reports a blocker
{
  "task": "deploy-v2.3",
  "blocker": "Database migration failed: column already exists",
  "attempts": 3,
  "escalated_to": "ceo-agent",
  "human_intervention_required": false
}
```

## Can I run it on-premises?

Yes, with the Enterprise tier:

### Deployment Options

| Option | Description | Best For |
|--------|-------------|----------|
| Cloud (default) | Hosted by GenBrain AI on GKE | Most teams |
| Dedicated cluster | Your own cluster, managed by GenBrain | Compliance needs |
| On-premises | Fully in your infrastructure | Strict data sovereignty |
| Hybrid | Control plane in cloud, agents on-prem | Mixed workloads |

### On-Premises Requirements

- Kubernetes 1.28+
- NATS cluster (provided as Helm chart)
- 8+ CPU cores, 32GB RAM minimum
- Persistent storage (100GB+)
- Outbound HTTPS for LLM API calls (or on-prem model serving)

### On-Premises Limitations

- You manage infrastructure upgrades
- Higher operational overhead
- LLM API calls still route to Anthropic (unless using a private endpoint)
- Some features may lag behind cloud version

Contact sales@genbrain.ai for on-premises pricing and architecture review.

## How do I get started?

### Quickstart (5 minutes)

1. Sign up at [app.agent.ceo](https://app.agent.ceo)
2. Create your organization
3. Deploy your first agent from a template
4. Assign a task and watch it complete

### Recommended Learning Path

1. [Migrating from Manual Ops](./migrate-from-manual.md) - Understand the migration strategy
2. [Best Practices](./best-practices.md) - Learn agent team design patterns
3. [Cost Optimization](./cost-optimization.md) - Keep costs under control
4. [Troubleshooting](./troubleshooting.md) - Know how to fix common issues

### Getting Help

- **Documentation**: docs.agent.ceo
- **Community Discord**: discord.gg/agentceo
- **Email support**: support@genbrain.ai
- **Enterprise support**: Dedicated Slack channel + hotline

## More Questions?

If your question is not answered here, reach out through any of the support channels above. We actively update this FAQ based on community questions.
