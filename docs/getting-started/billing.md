---
title: Billing and Pricing
description: agent.ceo pricing tiers, metered billing, free tier limits, and cost management. Understand agent-hour metering and optimize your spend.
---

# Billing and Pricing

agent.ceo uses metered billing based on **agent-hours** — the time each agent is in `running` status. Frozen agents do not consume agent-hours. Billing is processed through Stripe with transparent usage tracking.

## Pricing Tiers

| Plan | Price | Agents | Includes | Billing |
|------|-------|--------|----------|---------|
| **Free** | $0 | 1-3 | 168 agent-hours/month (1 agent-week) | N/A |
| **Standard** | $200/agent/month | 4-50 | Unlimited agent-hours per agent | Monthly |
| **Volume** | $160/agent/month | 51+ | Unlimited agent-hours per agent | Monthly |

### Free Tier

The free tier is designed for evaluation and small projects:

- **168 agent-hours/month** — Equivalent to 1 agent running 24/7 for a full week
- **Up to 3 agents** — Deploy any combination within the hour budget
- **All features included** — No feature restrictions, only usage limits
- **No credit card required** — Start immediately after account creation

!!!note
    168 hours shared across all agents. Running 3 agents simultaneously consumes 3 agent-hours per wall-clock hour. With 3 agents, you get approximately 56 hours of wall-clock runtime per month.

### Standard Plan

For production workloads with predictable teams:

- **$200/agent/month** flat rate per active agent slot
- **4 to 50 agent slots** — Scale up or down within the billing period
- **Unlimited agent-hours** — No per-hour metering within your slot count
- **Priority support** — 4-hour response SLA
- **30-day log retention**

### Volume Plan

For large organizations running 51+ agents:

- **$160/agent/month** — 20% discount over Standard
- **51+ agent slots**
- **Dedicated cluster option** — Isolated Kubernetes namespace with guaranteed resources
- **Custom SLA** — Up to 99.9% uptime guarantee
- **90-day log retention**
- **SSO/SAML** — Enterprise identity provider integration

!!!tip
    Contact sales@genbrain.ai for custom enterprise agreements, annual contracts with additional discounts, or dedicated infrastructure requirements.

## Agent-Hour Metering

### How Metering Works

The meter tracks the cumulative time each agent spends in `running` status:

```
Agent-Hours = SUM(agent_running_duration_seconds) / 3600
```

- **Clock starts** when agent status transitions to `running`
- **Clock stops** when agent transitions to `frozen`, `error`, or `terminated`
- **Metered in 1-second increments** — No rounding, no minimum charge per session
- **Meter ID**: `mtr_61ULkqdYGUVipMZDz41BjewIQRBg3OpU` (Stripe)

### Checking Usage

Query your current usage via the API:

```bash
curl -s https://api.agent.ceo/api/v1/organizations/org_a1b2c3d4/usage \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" | jq .
```

```json
{
  "organization_id": "org_a1b2c3d4",
  "plan": "free",
  "billing_period": {
    "start": "2026-05-01T00:00:00Z",
    "end": "2026-05-31T23:59:59Z"
  },
  "usage": {
    "agent_hours_used": 112.5,
    "agent_hours_limit": 168,
    "percentage_used": 66.96,
    "projected_end_of_month": 185.2
  },
  "per_agent": [
    {"agent_id": "agt_ceo_001", "role": "ceo", "hours": 45.2},
    {"agent_id": "agt_cto_001", "role": "cto", "hours": 38.8},
    {"agent_id": "agt_fs_001", "role": "fullstack", "hours": 28.5}
  ],
  "meter_id": "mtr_61ULkqdYGUVipMZDz41BjewIQRBg3OpU"
}
```

### Usage by Task

Break down agent-hours by task for cost attribution:

```bash
curl -s "https://api.agent.ceo/api/v1/organizations/org_a1b2c3d4/usage/by-task?period=current" \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" | jq '.tasks[:3]'
```

```json
[
  {
    "task_id": "tsk_001",
    "title": "Build authentication system",
    "total_agent_hours": 4.2,
    "agents_involved": ["cto", "fullstack", "security"],
    "status": "completed"
  },
  {
    "task_id": "tsk_002",
    "title": "Set up CI/CD pipeline",
    "total_agent_hours": 2.1,
    "agents_involved": ["devops"],
    "status": "completed"
  },
  {
    "task_id": "tsk_003",
    "title": "Frontend redesign",
    "total_agent_hours": 6.8,
    "agents_involved": ["fullstack", "cto"],
    "status": "in_progress"
  }
]
```

## Free Tier Limits

### Warning at 80%

When you reach 134.4 agent-hours (80% of 168):

- Dashboard displays a warning banner
- Email notification sent to org admins
- API response includes `usage_warning` field
- Webhook event `usage.threshold.warning` fires

```json
{
  "event": "usage.threshold.warning",
  "threshold": 0.80,
  "agent_hours_used": 134.4,
  "agent_hours_remaining": 33.6,
  "estimated_exhaustion": "2026-05-27T08:00:00Z"
}
```

### Hard Limit at 100%

When you reach 168 agent-hours:

- **Running agents continue** until their current task completes (grace period: 15 minutes)
- **New agent deployments blocked** — `POST /agents` returns `402 Payment Required`
- **Frozen agents cannot be resumed** — `POST /agents/{id}/resume` returns `402`
- **Existing running agents are frozen** after the grace period

```json
{
  "error": "usage_limit_exceeded",
  "message": "Free tier limit of 168 agent-hours reached. Upgrade to Standard plan or wait for next billing period.",
  "usage": {
    "used": 168.0,
    "limit": 168.0
  },
  "next_reset": "2026-06-01T00:00:00Z",
  "upgrade_url": "https://app.agent.ceo/settings/billing/upgrade"
}
```

!!!warning
    The 15-minute grace period allows agents to complete their current task and save state. Do not rely on this for long-running operations. Monitor usage proactively.

### Strategies to Stay Within Free Tier

1. **Freeze agents when idle** — A frozen agent costs zero hours
2. **Schedule agent activity** — Run agents only during work hours (8h/day = 56h/week for 1 agent)
3. **Use one agent at a time** — Sequential work maximizes your hour budget
4. **Set SLA limits** — Prevent tasks from consuming unbounded time

```bash
# Auto-freeze schedule: run agents only weekdays 9am-5pm
curl -X PUT https://api.agent.ceo/api/v1/agents/agt_cto_001/schedule \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "active_hours": {
      "timezone": "America/New_York",
      "schedule": "0 9 * * 1-5",
      "freeze_at": "0 17 * * 1-5"
    }
  }'
```

## Upgrading Plans

### Free to Standard

```bash
curl -X POST https://api.agent.ceo/api/v1/organizations/org_a1b2c3d4/billing/upgrade \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "standard",
    "agent_slots": 5,
    "payment_method": "pm_card_visa_4242"
  }'
```

```json
{
  "subscription_id": "sub_abc123",
  "plan": "standard",
  "agent_slots": 5,
  "monthly_cost": 1000.00,
  "next_invoice": "2026-06-01T00:00:00Z",
  "features_unlocked": [
    "unlimited_agent_hours",
    "priority_support",
    "30_day_log_retention"
  ]
}
```

### Adjusting Agent Slots

Scale your plan up or down within a billing period:

```bash
curl -X PATCH https://api.agent.ceo/api/v1/organizations/org_a1b2c3d4/billing/slots \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_slots": 8
  }'
```

!!!note
    Slot increases take effect immediately and are prorated. Slot decreases take effect at the next billing period to avoid disrupting running agents.

## Invoices and Payment

### Viewing Invoices

```bash
curl -s https://api.agent.ceo/api/v1/organizations/org_a1b2c3d4/billing/invoices \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" | jq '.invoices[:2]'
```

```json
[
  {
    "invoice_id": "inv_202605",
    "period": "2026-05-01 to 2026-05-31",
    "amount": 1000.00,
    "status": "paid",
    "pdf_url": "https://api.agent.ceo/invoices/inv_202605.pdf",
    "line_items": [
      {"description": "Standard Plan - 5 agent slots", "amount": 1000.00}
    ]
  }
]
```

### Payment Methods

agent.ceo accepts:

- Credit/debit cards (Visa, Mastercard, Amex)
- ACH bank transfer (Standard and Volume plans)
- Wire transfer (Volume plan, annual contracts)

Manage payment methods in the dashboard at **Settings > Billing > Payment Methods** or via API:

```bash
curl -X POST https://api.agent.ceo/api/v1/organizations/org_a1b2c3d4/billing/payment-methods \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "card",
    "stripe_token": "tok_visa_4242"
  }'
```

## Cost Management API

### Set Budget Limits

```bash
curl -X PUT https://api.agent.ceo/api/v1/organizations/org_a1b2c3d4/billing/budget \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_budget": 1500,
    "alerts": [
      {"percent": 80, "action": "notify"},
      {"percent": 95, "action": "notify"},
      {"percent": 100, "action": "freeze_non_critical"}
    ],
    "critical_agents": ["ceo", "devops"],
    "overage_policy": "block"
  }'
```

### Cost Projections

Get end-of-month cost projections based on current usage patterns:

```bash
curl -s https://api.agent.ceo/api/v1/organizations/org_a1b2c3d4/billing/projection \
  -H "Authorization: Bearer $AGENT_CEO_API_KEY" | jq .
```

```json
{
  "current_spend": 684.00,
  "projected_end_of_month": 1050.00,
  "days_remaining": 14,
  "daily_burn_rate": 26.15,
  "recommendations": [
    {
      "action": "freeze_agent",
      "agent": "agt_sec_001",
      "reason": "Security agent idle 85% of the time",
      "estimated_savings": 120.00
    }
  ]
}
```

## Billing FAQ

**Q: What happens if my payment fails?**

A: You have a 7-day grace period. Agents continue running. After 7 days, agents are frozen until payment is resolved.

**Q: Can I get a refund for unused agent slots?**

A: Downgrades are prorated to the day. Contact support@genbrain.ai for refund requests on annual plans.

**Q: Do frozen agents count toward my slot limit?**

A: Yes, frozen agents occupy a slot but do not consume agent-hours. Delete an agent to free the slot.

**Q: Is there an annual discount?**

A: Annual contracts receive a 15% discount. Contact sales@genbrain.ai for details.

**Q: How is the free tier reset?**

A: Agent-hour usage resets to zero on the first of each calendar month (UTC).

## Next Steps

- **[Deploy your first agent](first-agent.md)** — Start using your free tier allocation
- **[Set up a team](agent-team.md)** — Understand how team size affects costs
- **[Dashboard cost monitoring](dashboard.md)** — Track spending in real time
- **[Platform architecture](../platform/)** — Understand what you are paying for
- **[Contact sales](mailto:sales@genbrain.ai)** — Custom pricing for large deployments
