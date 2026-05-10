---
title: Enterprise Deployment Playbook
description: Complete guide to deploying agent.ceo at enterprise scale with multiple orgs, SSO integration, dedicated infrastructure, custom SLAs, and compliance requirements.
---

# Enterprise Deployment Playbook

This guide covers deploying agent.ceo in enterprise environments with requirements for multi-org structures, security compliance, dedicated infrastructure, and custom SLAs.

## Enterprise Architecture Overview

```
                    +---------------------------+
                    |    Enterprise Control     |
                    |        Plane             |
                    +---------------------------+
                    |  SSO  | RBAC | Audit Logs |
                    +---+-------+-------+-------+
                        |       |       |
              +---------+   +---+---+   +----------+
              |             |       |              |
        +-----+-----+ +----+----+ +----+----+ +---+-----+
        |  Org: Eng  | | Org: Ops| |Org: Sec | |Org: Data|
        +-----------+ +---------+ +---------+ +---------+
        | CTO Agent | | DevOps  | | CSO     | | Data Eng|
        | Fullstack | | SRE     | | Pentest | | ML Ops  |
        | QA Agent  | | Release | | Audit   | | Analytics|
        +-----------+ +---------+ +---------+ +---------+
```

## Prerequisites

Before starting enterprise deployment:

- [ ] Signed Enterprise agreement with GenBrain AI
- [ ] Designated Platform Admin(s) identified
- [ ] SSO provider details ready (SAML 2.0 or OIDC)
- [ ] Network requirements documented
- [ ] Compliance requirements identified (SOC2, HIPAA, etc.)
- [ ] Dedicated infrastructure region selected

## Step 1: Multi-Organization Setup

Enterprise deployments use a parent-child org structure:

```bash
# Create parent enterprise org
curl -X POST https://api.agent.ceo/v1/enterprise/orgs \
  -H "Authorization: Bearer $ENTERPRISE_API_KEY" \
  -d '{
    "name": "acme-corp",
    "type": "enterprise-parent",
    "plan": "enterprise",
    "settings": {
      "max_child_orgs": 20,
      "shared_templates": true,
      "centralized_billing": true
    }
  }'
```

### Child Organization Structure

| Org Pattern | Use Case | Example |
|-------------|----------|---------|
| By department | Large companies with distinct teams | eng, ops, security, data |
| By product | Multi-product companies | product-a, product-b |
| By environment | Strict env separation | dev, staging, production |
| By region | Global compliance needs | us-east, eu-west, apac |

```bash
# Create child orgs
for org in engineering operations security; do
  curl -X POST https://api.agent.ceo/v1/enterprise/orgs/acme-corp/children \
    -H "Authorization: Bearer $ENTERPRISE_API_KEY" \
    -d "{
      \"name\": \"acme-${org}\",
      \"admin_email\": \"${org}-lead@acme.com\",
      \"agent_limit\": 25,
      \"budget_monthly_usd\": 5000
    }"
done
```

## Step 2: SSO Integration

### SAML 2.0 Configuration

```bash
curl -X POST https://api.agent.ceo/v1/enterprise/sso \
  -H "Authorization: Bearer $ENTERPRISE_API_KEY" \
  -d '{
    "provider": "saml2",
    "entity_id": "https://acme.okta.com/app/abc123",
    "sso_url": "https://acme.okta.com/app/abc123/sso/saml",
    "certificate": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
    "attribute_mapping": {
      "email": "user.email",
      "name": "user.displayName",
      "role": "user.department",
      "org": "user.division"
    },
    "auto_provision": true,
    "default_role": "viewer"
  }'
```

### OIDC Configuration

```bash
curl -X POST https://api.agent.ceo/v1/enterprise/sso \
  -H "Authorization: Bearer $ENTERPRISE_API_KEY" \
  -d '{
    "provider": "oidc",
    "issuer": "https://acme.auth0.com/",
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "scopes": ["openid", "profile", "email", "groups"],
    "role_claim": "groups"
  }'
```

### Role Mapping

Map your identity provider groups to agent.ceo roles:

| IdP Group | agent.ceo Role | Permissions |
|-----------|---------------|-------------|
| `platform-admins` | `enterprise-admin` | Full control across all orgs |
| `eng-leads` | `org-admin` | Manage agents within their org |
| `developers` | `operator` | Interact with agents, assign tasks |
| `viewers` | `viewer` | Read-only dashboard access |

## Step 3: Custom Agent Templates

Enterprise customers can create organization-wide templates that enforce company standards:

```bash
curl -X POST https://api.agent.ceo/v1/enterprise/templates \
  -H "Authorization: Bearer $ENTERPRISE_API_KEY" \
  -d '{
    "name": "acme-devops",
    "base_template": "devops-starter",
    "overrides": {
      "required_tools": ["kubectl", "gh", "terraform"],
      "forbidden_actions": ["delete-namespace", "force-push-main"],
      "required_pre_commit_hooks": ["test-evidence", "security-scan"],
      "max_token_budget_per_task": 100000,
      "escalation_policy": "always-escalate-production"
    },
    "compliance_tags": ["soc2", "change-management"],
    "available_to_orgs": ["acme-engineering", "acme-operations"]
  }'
```

### Template Governance

!!!tip
    Use template inheritance to enforce company-wide policies while allowing team-specific customization.

```
enterprise-base (company policies, security rules)
  |-- engineering-base (code quality, testing requirements)
  |     |-- frontend-agent (React/Next.js tooling)
  |     |-- backend-agent (Python/Go tooling)
  |-- operations-base (infrastructure policies)
        |-- devops-agent (CI/CD, K8s)
        |-- sre-agent (monitoring, incident response)
```

## Step 4: Dedicated Infrastructure

Enterprise tier includes dedicated infrastructure options:

### Deployment Options

| Option | Latency | Isolation | Compliance | Cost |
|--------|---------|-----------|------------|------|
| Shared (default) | Low | Namespace-level | SOC2 | Base pricing |
| Dedicated cluster | Low | Cluster-level | SOC2, HIPAA | +40% |
| On-premises | Varies | Full | All | Custom quote |
| Hybrid | Low | Mixed | Flexible | Custom quote |

### Dedicated Cluster Setup

```bash
curl -X POST https://api.agent.ceo/v1/enterprise/infrastructure \
  -H "Authorization: Bearer $ENTERPRISE_API_KEY" \
  -d '{
    "type": "dedicated-cluster",
    "region": "us-east-1",
    "node_pool": {
      "machine_type": "n2-standard-8",
      "min_nodes": 3,
      "max_nodes": 20,
      "auto_scaling": true
    },
    "networking": {
      "vpc_peering": true,
      "private_endpoints": true,
      "allowed_cidrs": ["10.0.0.0/8", "172.16.0.0/12"]
    },
    "encryption": {
      "at_rest": "customer-managed-key",
      "kms_key_id": "projects/acme/locations/us/keyRings/agent-ceo/cryptoKeys/main"
    }
  }'
```

### Network Architecture

```
Your VPC                          agent.ceo Dedicated Cluster
+------------------+              +---------------------------+
|                  |   VPC Peer   |                           |
|  App Servers  ---+---/Private---+---> Agent Runtime         |
|                  |   Endpoint   |                           |
|  CI/CD       ----+              |     NATS (agent comms)    |
|                  |              |     K8s (orchestration)   |
|  Monitoring  <---+--------------+---- Metrics Export        |
|                  |              |                           |
+------------------+              +---------------------------+
```

## Step 5: Custom SLAs

Enterprise SLAs are configurable per agent and per task type:

```bash
curl -X POST https://api.agent.ceo/v1/enterprise/slas \
  -H "Authorization: Bearer $ENTERPRISE_API_KEY" \
  -d '{
    "name": "critical-operations",
    "applies_to": {
      "orgs": ["acme-operations"],
      "task_priority": ["P0", "P1"]
    },
    "targets": {
      "task_acknowledgement_seconds": 30,
      "task_completion_p50_minutes": 15,
      "task_completion_p99_minutes": 60,
      "agent_availability_percent": 99.9,
      "escalation_response_minutes": 5
    },
    "alerts": {
      "channels": ["pagerduty", "slack:#critical-ops"],
      "escalation_chain": ["ops-lead@acme.com", "vp-eng@acme.com"]
    },
    "penalties": {
      "credit_per_breach_percent": 5,
      "max_monthly_credit_percent": 25
    }
  }'
```

### SLA Tiers

| Tier | Availability | Task ACK | Task Complete (P50) | Support |
|------|-------------|----------|---------------------|---------|
| Standard | 99.5% | 5 min | 60 min | Email (24h) |
| Professional | 99.9% | 1 min | 30 min | Chat (4h) |
| Enterprise | 99.95% | 30 sec | 15 min | Dedicated (1h) |
| Mission Critical | 99.99% | 10 sec | 5 min | 24/7 hotline |

## Step 6: Compliance Configuration

### SOC 2 Type II

Enabled by default for all enterprise accounts:

- All agent actions logged with immutable audit trail
- Access reviews automated quarterly
- Change management enforced via task lifecycle
- Encryption at rest (AES-256) and in transit (TLS 1.3)

### HIPAA

Requires dedicated infrastructure:

```bash
curl -X PATCH https://api.agent.ceo/v1/enterprise/compliance \
  -d '{
    "hipaa_enabled": true,
    "baa_signed_date": "2026-01-15",
    "phi_handling": {
      "agents_with_phi_access": ["acme-healthcare/medical-records-agent"],
      "encryption": "customer-managed-key",
      "retention_days": 365,
      "audit_frequency": "real-time"
    }
  }'
```

### GDPR

Available with EU data residency options. Contact sales for GDPR-specific configuration.

## Pricing: Enterprise Volume

| Agents | Per Agent/Month | Savings vs Standard |
|--------|----------------|---------------------|
| 1-10 | $200 | - |
| 11-50 | $180 | 10% |
| 51-100 | $160 | 20% |
| 101-500 | $140 | 30% |
| 500+ | Custom | Contact sales |

!!!tip
    Volume pricing applies automatically across all child orgs. A parent org with 3 children running 20 agents each (60 total) qualifies for the $160/agent tier.

### White-Label Options (Enterprise Tier)

Enterprise customers can white-label the platform:

- Custom domain (e.g., agents.acme.com)
- Custom branding on dashboards and emails
- Custom agent personas and voice
- Branded API documentation and onboarding flows

Contact sales@genbrain.ai for white-label configuration.

## Step 7: Rollout Plan

### Recommended Enterprise Rollout Timeline

| Phase | Duration | Activities |
|-------|----------|------------|
| Planning | 2 weeks | Requirements, compliance review, architecture |
| Infrastructure | 1 week | Dedicated cluster, networking, SSO |
| Pilot | 4 weeks | Single team, 3-5 agents, validate patterns |
| Expansion | 4 weeks | Additional teams, custom templates |
| Full Deployment | Ongoing | All teams, full autonomy, SLA enforcement |

### Success Metrics

Track these KPIs during rollout:

- **Time saved**: Hours reclaimed per engineer per week
- **Task throughput**: Tasks completed per agent per day
- **Quality**: Error rate, rollback frequency
- **Cost efficiency**: Cost per task completed
- **Adoption**: Active users interacting with agents

## Next Steps

- [Cost Optimization Guide](./cost-optimization.md) for managing enterprise-scale costs
- [Best Practices](./best-practices.md) for designing agent team structures
- [Troubleshooting](./troubleshooting.md) for common enterprise issues
- Contact sales@genbrain.ai for custom enterprise pricing
