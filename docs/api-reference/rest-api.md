---
title: REST API Reference
description: Complete reference for the agent.ceo FastAPI gateway REST endpoints. Covers organizations, agents, tasks, usage, billing, costs, customers, and MFA.
---

# REST API Reference

The agent.ceo platform exposes a FastAPI gateway with 58+ REST endpoints for managing organizations, agents, tasks, billing, and more.

### Base URLs

| Deployment | Base URL |
|-----------|----------|
| **SaaS (Hosted)** | `https://api.agent.ceo` |
| **Enterprise (Self-Hosted)** | `https://api.agents.yourcompany.com` (your custom domain) |

Enterprise customers receive a dedicated Gateway instance running in their own cloud account. The API surface is identical — only the base URL differs. See [Enterprise Deployment](../deployment/enterprise.md) for setup.

## Authentication

All endpoints require authentication unless otherwise noted. Include your API key in the `Authorization` header:

```
Authorization: Bearer <your-api-key>
```

Operator-scoped keys have access to all resources within their organization. Agent-scoped keys are limited to the agent's own resources.

Enterprise installations can use OIDC/SAML tokens from a corporate identity provider instead of Firebase JWT tokens. The Gateway validates tokens against the configured issuer.

---

## Organizations

Endpoints for provisioning and managing organizations.

### POST /api/v1/organizations/provision

Provision a new organization with default configuration, billing, and agent namespace.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `name` | body | string | Yes | Organization display name |
| `plan` | body | string | Yes | Subscription plan: `free`, `starter`, `pro`, `enterprise` |
| `owner_email` | body | string | Yes | Email of the organization owner |
| `region` | body | string | No | Deployment region (default: `us-central1`) |

**Auth**: Operator API key with `org:create` scope.

**Request**:

```json
{
  "name": "Acme Corp AI",
  "plan": "pro",
  "owner_email": "admin@acme.com",
  "region": "us-central1"
}
```

**Response** (`201 Created`):

```json
{
  "org_id": "org_a1b2c3d4",
  "name": "Acme Corp AI",
  "plan": "pro",
  "status": "provisioning",
  "created_at": "2026-01-15T10:30:00Z",
  "namespace": "acme-corp-ai",
  "api_key": "ak_live_xxxxxxxxxxxx"
}
```

---

### GET /api/v1/organizations/{org_id}

Retrieve organization details by ID.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `org_id` | path | string | Yes | Organization identifier |

**Auth**: Operator API key belonging to the organization.

**Response** (`200 OK`):

```json
{
  "org_id": "org_a1b2c3d4",
  "name": "Acme Corp AI",
  "plan": "pro",
  "status": "active",
  "created_at": "2026-01-15T10:30:00Z",
  "namespace": "acme-corp-ai",
  "agent_count": 5,
  "owner_email": "admin@acme.com",
  "region": "us-central1"
}
```

---

### GET /api/v1/organizations/{org_id}/status

Get provisioning and operational status for an organization.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `org_id` | path | string | Yes | Organization identifier |

**Auth**: Operator API key belonging to the organization.

**Response** (`200 OK`):

```json
{
  "org_id": "org_a1b2c3d4",
  "status": "active",
  "provisioning_progress": 100,
  "services": {
    "nats": "connected",
    "k8s_namespace": "ready",
    "billing": "active",
    "mcp_gateway": "healthy"
  },
  "last_health_check": "2026-01-15T12:00:00Z"
}
```

---

## Agents

Endpoints for listing, monitoring, and registering agents.

### GET /api/v1/agents

List all agents in the organization.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `status` | query | string | No | Filter by status: `running`, `stopped`, `frozen` |
| `role` | query | string | No | Filter by agent role |
| `limit` | query | integer | No | Max results (default: 50, max: 200) |
| `offset` | query | integer | No | Pagination offset |

**Auth**: Operator API key.

**Response** (`200 OK`):

```json
{
  "agents": [
    {
      "agent_id": "agt_cto_001",
      "name": "CTO Agent",
      "role": "cto",
      "status": "running",
      "last_active": "2026-01-15T12:30:00Z",
      "task_count": 3,
      "uptime_hours": 168.5
    }
  ],
  "total": 5,
  "limit": 50,
  "offset": 0
}
```

---

### GET /api/v1/agents/health

Get health status for all agents in the organization.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `include_metrics` | query | boolean | No | Include CPU/memory metrics (default: false) |

**Auth**: Operator API key.

**Response** (`200 OK`):

```json
{
  "healthy": 4,
  "unhealthy": 1,
  "agents": [
    {
      "agent_id": "agt_cto_001",
      "name": "CTO Agent",
      "healthy": true,
      "last_heartbeat": "2026-01-15T12:30:00Z",
      "cpu_percent": 12.5,
      "memory_mb": 256
    }
  ]
}
```

---

### POST /api/v1/internal/agents/register

Register a new agent instance with the platform. This is an internal endpoint called during agent boot.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `agent_id` | body | string | Yes | Unique agent identifier |
| `role` | body | string | Yes | Agent role (e.g., `cto`, `fullstack`, `devops`) |
| `capabilities` | body | array[string] | Yes | List of agent capabilities |
| `version` | body | string | Yes | Agent software version |

**Auth**: Internal service token.

**Request**:

```json
{
  "agent_id": "agt_cto_001",
  "role": "cto",
  "capabilities": ["code_review", "architecture", "k8s_management"],
  "version": "2.4.1"
}
```

**Response** (`201 Created`):

```json
{
  "agent_id": "agt_cto_001",
  "registered_at": "2026-01-15T10:00:00Z",
  "nats_credentials": {
    "subject_prefix": "genbrain.agents.agt_cto_001",
    "token": "nat_xxxxxxxx"
  },
  "assigned_tasks": []
}
```

---

## Tasks

Endpoints for creating, listing, and managing tasks.

### GET /api/v1/tasks

List tasks in the organization with optional filters.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `status` | query | string | No | Filter: `pending`, `in_progress`, `completed`, `failed`, `verified` |
| `assignee` | query | string | No | Filter by assigned agent ID |
| `priority` | query | string | No | Filter: `p0`, `p1`, `p2`, `p3` |
| `limit` | query | integer | No | Max results (default: 50) |
| `offset` | query | integer | No | Pagination offset |

**Auth**: Operator API key.

**Response** (`200 OK`):

```json
{
  "tasks": [
    {
      "task_id": "tsk_abc123",
      "title": "Implement user authentication",
      "status": "in_progress",
      "priority": "p1",
      "assignee": "agt_fullstack_001",
      "created_at": "2026-01-15T09:00:00Z",
      "updated_at": "2026-01-15T11:30:00Z"
    }
  ],
  "total": 12,
  "limit": 50,
  "offset": 0
}
```

---

### POST /api/v1/tasks

Create a new task and optionally assign it to an agent.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `title` | body | string | Yes | Task title |
| `description` | body | string | Yes | Detailed task description |
| `priority` | body | string | No | Priority level (default: `p2`) |
| `assignee` | body | string | No | Agent ID to assign to |
| `verification_steps` | body | array[string] | No | Steps to verify completion |
| `deadline` | body | string | No | ISO 8601 deadline |

**Auth**: Operator API key with `task:create` scope.

**Request**:

```json
{
  "title": "Add rate limiting to API gateway",
  "description": "Implement per-key rate limiting using Redis sliding window.",
  "priority": "p1",
  "assignee": "agt_cto_001",
  "verification_steps": [
    "Run pytest tests/test_rate_limit.py",
    "Verify 429 response after exceeding limit"
  ],
  "deadline": "2026-01-16T18:00:00Z"
}
```

**Response** (`201 Created`):

```json
{
  "task_id": "tsk_def456",
  "title": "Add rate limiting to API gateway",
  "status": "pending",
  "priority": "p1",
  "assignee": "agt_cto_001",
  "created_at": "2026-01-15T12:00:00Z",
  "verification_steps": [
    "Run pytest tests/test_rate_limit.py",
    "Verify 429 response after exceeding limit"
  ]
}
```

---

### GET /api/v1/tasks/{task_id}

Get detailed information about a specific task.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `task_id` | path | string | Yes | Task identifier |

**Auth**: Operator API key or agent key (if assigned).

**Response** (`200 OK`):

```json
{
  "task_id": "tsk_def456",
  "title": "Add rate limiting to API gateway",
  "description": "Implement per-key rate limiting using Redis sliding window.",
  "status": "in_progress",
  "priority": "p1",
  "assignee": "agt_cto_001",
  "created_at": "2026-01-15T12:00:00Z",
  "updated_at": "2026-01-15T13:00:00Z",
  "progress": [
    {
      "timestamp": "2026-01-15T12:30:00Z",
      "message": "Analyzing existing middleware structure"
    }
  ],
  "verification_steps": [
    "Run pytest tests/test_rate_limit.py",
    "Verify 429 response after exceeding limit"
  ],
  "evidence": null
}
```

---

### GET /api/v1/tasks/summary

Get an aggregated summary of task metrics for the organization.

**Auth**: Operator API key.

**Response** (`200 OK`):

```json
{
  "total": 47,
  "by_status": {
    "pending": 5,
    "in_progress": 8,
    "completed": 28,
    "failed": 2,
    "verified": 4
  },
  "by_priority": {
    "p0": 1,
    "p1": 12,
    "p2": 25,
    "p3": 9
  },
  "avg_completion_hours": 4.2,
  "completion_rate": 0.93
}
```

---

## Usage

Endpoints for tracking API and compute usage.

### GET /api/v1/usage/summary

Get current billing period usage summary.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `period` | query | string | No | Billing period (default: current) |

**Auth**: Operator API key.

**Response** (`200 OK`):

```json
{
  "period_start": "2026-01-01T00:00:00Z",
  "period_end": "2026-01-31T23:59:59Z",
  "api_calls": 15420,
  "compute_hours": 312.5,
  "nats_messages": 89340,
  "storage_gb": 2.4,
  "total_cost_usd": 142.50
}
```

---

### POST /api/v1/usage/log

Log a usage event. Called internally by agents and services.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `agent_id` | body | string | Yes | Agent that incurred usage |
| `type` | body | string | Yes | Usage type: `api_call`, `compute`, `storage`, `llm_tokens` |
| `quantity` | body | number | Yes | Amount consumed |
| `metadata` | body | object | No | Additional context |

**Auth**: Internal service token or agent key.

**Request**:

```json
{
  "agent_id": "agt_cto_001",
  "type": "llm_tokens",
  "quantity": 4500,
  "metadata": {
    "model": "claude-opus-4-6",
    "task_id": "tsk_def456"
  }
}
```

**Response** (`201 Created`):

```json
{
  "usage_id": "usg_xyz789",
  "recorded_at": "2026-01-15T12:35:00Z"
}
```

---

### GET /api/v1/usage/history

Get historical usage data with time-series breakdown.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `start_date` | query | string | No | ISO 8601 start (default: 30 days ago) |
| `end_date` | query | string | No | ISO 8601 end (default: now) |
| `granularity` | query | string | No | `hourly`, `daily`, `weekly` (default: `daily`) |
| `type` | query | string | No | Filter by usage type |

**Auth**: Operator API key.

**Response** (`200 OK`):

```json
{
  "start_date": "2026-01-01T00:00:00Z",
  "end_date": "2026-01-15T23:59:59Z",
  "granularity": "daily",
  "data": [
    {
      "date": "2026-01-15",
      "api_calls": 1250,
      "compute_hours": 22.3,
      "nats_messages": 6200,
      "cost_usd": 9.80
    }
  ]
}
```

---

## Billing

Endpoints for subscription and billing management.

### GET /api/v1/billing/subscription

Get current subscription details.

**Auth**: Operator API key with `billing:read` scope.

**Response** (`200 OK`):

```json
{
  "plan": "pro",
  "status": "active",
  "started_at": "2026-01-01T00:00:00Z",
  "renews_at": "2026-02-01T00:00:00Z",
  "monthly_limit_usd": 500.00,
  "current_spend_usd": 142.50,
  "payment_method": {
    "type": "card",
    "last_four": "4242",
    "expires": "2027-12"
  }
}
```

---

### GET /api/v1/billing/usage

Get billing-specific usage breakdown for the current period.

**Auth**: Operator API key with `billing:read` scope.

**Response** (`200 OK`):

```json
{
  "period": "2026-01",
  "line_items": [
    {
      "category": "compute",
      "description": "Agent compute hours",
      "quantity": 312.5,
      "unit": "hours",
      "unit_price_usd": 0.35,
      "total_usd": 109.38
    },
    {
      "category": "api_calls",
      "description": "API gateway requests",
      "quantity": 15420,
      "unit": "requests",
      "unit_price_usd": 0.001,
      "total_usd": 15.42
    }
  ],
  "subtotal_usd": 142.50,
  "tax_usd": 0.00,
  "total_usd": 142.50
}
```

---

### GET /api/v1/billing/history

Get billing history with past invoices.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `limit` | query | integer | No | Number of invoices (default: 12) |

**Auth**: Operator API key with `billing:read` scope.

**Response** (`200 OK`):

```json
{
  "invoices": [
    {
      "invoice_id": "inv_20260101",
      "period": "2025-12",
      "total_usd": 128.30,
      "status": "paid",
      "paid_at": "2026-01-03T10:00:00Z",
      "pdf_url": "https://api.agent.ceo/invoices/inv_20260101.pdf"
    }
  ],
  "total": 3
}
```

---

## Costs

Endpoints for cost analysis and optimization.

### GET /api/v1/costs

Get detailed cost breakdown by agent and resource type.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `start_date` | query | string | No | ISO 8601 start date |
| `end_date` | query | string | No | ISO 8601 end date |
| `group_by` | query | string | No | `agent`, `resource`, `task` (default: `agent`) |

**Auth**: Operator API key.

**Response** (`200 OK`):

```json
{
  "period": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-01-15T23:59:59Z"
  },
  "total_usd": 142.50,
  "breakdown": [
    {
      "agent_id": "agt_cto_001",
      "agent_name": "CTO Agent",
      "compute_usd": 45.20,
      "llm_tokens_usd": 32.10,
      "storage_usd": 1.50,
      "total_usd": 78.80
    }
  ]
}
```

---

### GET /api/v1/costs/summary

Get a high-level cost summary with trend data.

**Auth**: Operator API key.

**Response** (`200 OK`):

```json
{
  "current_month_usd": 142.50,
  "previous_month_usd": 128.30,
  "change_percent": 11.1,
  "projected_month_end_usd": 285.00,
  "budget_usd": 500.00,
  "budget_remaining_usd": 357.50,
  "top_cost_driver": "agt_cto_001"
}
```

---

## Customers

Endpoints for managing customer agent access and API keys.

### GET /api/v1/customers/{id}/agents

List agents accessible to a specific customer.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `id` | path | string | Yes | Customer identifier |

**Auth**: Operator API key with `customers:read` scope.

**Response** (`200 OK`):

```json
{
  "customer_id": "cust_abc123",
  "agents": [
    {
      "agent_id": "agt_support_001",
      "name": "Support Agent",
      "role": "support",
      "status": "running",
      "permissions": ["task:create", "task:read"]
    }
  ],
  "total": 1
}
```

---

### POST /api/v1/customers/{id}/api-keys

Generate a new API key scoped to a customer.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `id` | path | string | Yes | Customer identifier |
| `name` | body | string | Yes | Key display name |
| `scopes` | body | array[string] | Yes | Permission scopes |
| `expires_in_days` | body | integer | No | Key expiration (default: 90) |

**Auth**: Operator API key with `customers:manage` scope.

**Request**:

```json
{
  "name": "Production Key",
  "scopes": ["task:create", "task:read", "agents:read"],
  "expires_in_days": 90
}
```

**Response** (`201 Created`):

```json
{
  "key_id": "key_xyz789",
  "api_key": "ak_cust_xxxxxxxxxxxxxxxxxxxx",
  "name": "Production Key",
  "scopes": ["task:create", "task:read", "agents:read"],
  "created_at": "2026-01-15T12:00:00Z",
  "expires_at": "2026-04-15T12:00:00Z"
}
```

!!! warning
    The `api_key` value is only returned once at creation time. Store it securely.

---

## MFA

Multi-factor authentication enrollment and verification endpoints.

### POST /api/v1/mfa/enroll

Initiate MFA enrollment for the authenticated user.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `method` | body | string | Yes | MFA method: `totp`, `sms`, `email` |
| `phone_number` | body | string | No | Required if method is `sms` |

**Auth**: Operator API key (user-scoped).

**Request**:

```json
{
  "method": "totp"
}
```

**Response** (`200 OK`):

```json
{
  "enrollment_id": "enr_abc123",
  "method": "totp",
  "secret": "JBSWY3DPEHPK3PXP",
  "qr_code_url": "https://api.agent.ceo/mfa/qr/enr_abc123.png",
  "expires_at": "2026-01-15T12:10:00Z"
}
```

---

### POST /api/v1/mfa/verify

Verify the enrollment by providing the first valid code.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `enrollment_id` | body | string | Yes | Enrollment ID from enroll step |
| `code` | body | string | Yes | 6-digit TOTP code |

**Auth**: Operator API key (user-scoped).

**Request**:

```json
{
  "enrollment_id": "enr_abc123",
  "code": "482901"
}
```

**Response** (`200 OK`):

```json
{
  "verified": true,
  "recovery_codes": [
    "ABCD-1234-EFGH",
    "IJKL-5678-MNOP",
    "QRST-9012-UVWX"
  ]
}
```

!!! warning
    Recovery codes are shown only once. Store them in a secure location.

---

### POST /api/v1/mfa/challenge

Initiate an MFA challenge during login or sensitive operations.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `session_token` | body | string | Yes | Session token from initial auth |

**Auth**: Session token (pre-MFA).

**Request**:

```json
{
  "session_token": "sess_temporary_xyz"
}
```

**Response** (`200 OK`):

```json
{
  "challenge_id": "chl_def456",
  "method": "totp",
  "expires_at": "2026-01-15T12:05:00Z"
}
```

---

### POST /api/v1/mfa/validate

Validate an MFA challenge response.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `challenge_id` | body | string | Yes | Challenge ID |
| `code` | body | string | Yes | 6-digit code or recovery code |

**Auth**: Session token (pre-MFA).

**Request**:

```json
{
  "challenge_id": "chl_def456",
  "code": "739201"
}
```

**Response** (`200 OK`):

```json
{
  "validated": true,
  "access_token": "ak_live_xxxxxxxxxxxx",
  "expires_at": "2026-01-15T20:00:00Z"
}
```

---

### DELETE /api/v1/mfa/unenroll

Remove MFA enrollment for the authenticated user.

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `code` | body | string | Yes | Current valid MFA code to confirm |

**Auth**: Operator API key (user-scoped) with valid MFA session.

**Request**:

```json
{
  "code": "184723"
}
```

**Response** (`200 OK`):

```json
{
  "unenrolled": true,
  "method_removed": "totp"
}
```

---

### GET /api/v1/mfa/status

Check MFA enrollment status for the authenticated user.

**Auth**: Operator API key (user-scoped).

**Response** (`200 OK`):

```json
{
  "enrolled": true,
  "method": "totp",
  "enrolled_at": "2026-01-10T08:00:00Z",
  "last_used": "2026-01-15T09:30:00Z",
  "recovery_codes_remaining": 3
}
```

---

## Rate Limiting

All endpoints enforce rate limits based on your subscription plan:

| Plan | Requests/minute | Burst |
|------|----------------|-------|
| Free | 60 | 10 |
| Starter | 300 | 50 |
| Pro | 1000 | 200 |
| Enterprise | 5000 | 1000 |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 997
X-RateLimit-Reset: 1705312800
```

When rate limited, the API returns `429 Too Many Requests`. See the [Error Codes](./error-codes.md) reference for details.

---

## Pagination

List endpoints support cursor-based pagination via `limit` and `offset` parameters. The response includes `total` count for calculating pages.

```
GET /api/v1/tasks?limit=20&offset=40
```

---

## Related Resources

- [WebSocket API](./websocket-api.md) for real-time event streaming
- [NATS API](./nats-api.md) for agent-to-agent messaging
- [MCP Catalog](./mcp-catalog.md) for agent tool reference
- [Error Codes](./error-codes.md) for error handling
