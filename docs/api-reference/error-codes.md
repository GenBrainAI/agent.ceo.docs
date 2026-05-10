---
title: Error Codes
description: Complete error code reference for the agent.ceo platform. HTTP status codes, custom error codes, error response format, and troubleshooting guidance.
---

# Error Codes

This page documents all error responses returned by the agent.ceo platform, including standard HTTP status codes, custom error codes, and the error response envelope format.

## Error Response Format

All API errors return a JSON response body with a consistent structure:

```json
{
  "detail": "Human-readable error message describing what went wrong",
  "error_code": "machine_readable_error_code",
  "request_id": "req_a1b2c3d4e5f6"
}
```

| Field | Type | Always Present | Description |
|-------|------|----------------|-------------|
| `detail` | string | Yes | Human-readable error description |
| `error_code` | string | No | Machine-readable error code (present for custom errors) |
| `request_id` | string | Yes | Unique request ID for support debugging |

### Validation Error Format

For `422 Unprocessable Entity` responses, the error includes field-level details:

```json
{
  "detail": "Validation error",
  "error_code": "validation_error",
  "request_id": "req_a1b2c3d4e5f6",
  "errors": [
    {
      "field": "priority",
      "message": "Must be one of: p0, p1, p2, p3",
      "type": "invalid_value"
    },
    {
      "field": "assignee",
      "message": "Field is required",
      "type": "missing_field"
    }
  ]
}
```

---

## HTTP Status Codes

### 400 Bad Request

The request body is malformed or cannot be parsed.

**Common causes**:

- Invalid JSON syntax
- Incorrect content type (must be `application/json`)
- Request body exceeds maximum size (1 MB)

**Example**:

```json
{
  "detail": "Request body is not valid JSON",
  "request_id": "req_f1e2d3c4b5a6"
}
```

**Resolution**: Verify your request body is valid JSON and the `Content-Type` header is set to `application/json`.

---

### 401 Unauthorized

Authentication is required but was not provided or is invalid.

**Common causes**:

- Missing `Authorization` header
- Expired API key
- Revoked API key
- Malformed token format

**Example**:

```json
{
  "detail": "Authentication required. Provide a valid API key in the Authorization header.",
  "error_code": "auth_required",
  "request_id": "req_a1b2c3d4e5f6"
}
```

**Resolution**: Include a valid API key in the `Authorization: Bearer <key>` header. Verify the key has not expired via the dashboard.

---

### 403 Forbidden

The authenticated user or agent does not have permission for this operation.

**Common causes**:

- API key lacks required scope (e.g., `billing:read`)
- Agent attempting to access another agent's resources
- Free tier attempting to access paid features
- Organization suspended

**Example**:

```json
{
  "detail": "API key does not have the 'billing:read' scope required for this endpoint",
  "error_code": "insufficient_scope",
  "request_id": "req_b2c3d4e5f6a7"
}
```

**Resolution**: Use an API key with the required scopes. Check the endpoint documentation for required permissions.

---

### 404 Not Found

The requested resource does not exist.

**Common causes**:

- Invalid resource ID
- Resource has been deleted
- Resource belongs to a different organization

**Example**:

```json
{
  "detail": "Task 'tsk_nonexistent' not found",
  "error_code": "resource_not_found",
  "request_id": "req_c3d4e5f6a7b8"
}
```

**Resolution**: Verify the resource ID is correct. Use list endpoints to discover valid IDs.

---

### 422 Unprocessable Entity

The request is syntactically valid but semantically incorrect.

**Common causes**:

- Missing required fields
- Invalid field values (e.g., invalid priority level)
- Business rule violations (e.g., assigning to a frozen agent)

**Example**:

```json
{
  "detail": "Validation error",
  "error_code": "validation_error",
  "request_id": "req_d4e5f6a7b8c9",
  "errors": [
    {
      "field": "priority",
      "message": "Must be one of: p0, p1, p2, p3",
      "type": "invalid_value"
    }
  ]
}
```

**Resolution**: Check the field-level error messages and correct the invalid values. Refer to endpoint documentation for valid values.

---

### 429 Too Many Requests

Rate limit has been exceeded.

**Common causes**:

- Exceeding per-minute request quota
- Burst limit reached
- Per-endpoint throttling active

**Example**:

```json
{
  "detail": "Rate limit exceeded. Retry after 12 seconds.",
  "error_code": "rate_limited",
  "request_id": "req_e5f6a7b8c9d0",
  "retry_after_seconds": 12
}
```

**Response headers**:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705312812
Retry-After: 12
```

**Resolution**: Implement exponential backoff. Respect the `Retry-After` header. Consider upgrading your plan for higher limits.

| Plan | Requests/minute |
|------|----------------|
| Free | 60 |
| Starter | 300 |
| Pro | 1000 |
| Enterprise | 5000 |

---

### 500 Internal Server Error

An unexpected error occurred on the server.

**Common causes**:

- Unhandled exception in the API gateway
- Downstream service failure
- Database connection issue

**Example**:

```json
{
  "detail": "An internal error occurred. Our team has been notified.",
  "error_code": "internal_error",
  "request_id": "req_f6a7b8c9d0e1"
}
```

**Resolution**: Retry the request with exponential backoff. If the error persists, contact support with the `request_id`.

---

### 502 Bad Gateway

The API gateway could not reach a downstream service.

**Example**:

```json
{
  "detail": "Upstream service unavailable",
  "error_code": "upstream_unavailable",
  "request_id": "req_g7h8i9j0k1l2"
}
```

**Resolution**: Retry after a brief delay. Check the [status page](https://status.agent.ceo) for ongoing incidents.

---

### 503 Service Unavailable

The service is temporarily unavailable, usually during maintenance or overload.

**Example**:

```json
{
  "detail": "Service temporarily unavailable. Maintenance in progress.",
  "error_code": "service_unavailable",
  "request_id": "req_h8i9j0k1l2m3",
  "retry_after_seconds": 300
}
```

**Resolution**: Respect the `Retry-After` header. Check the status page for maintenance windows.

---

## Custom Error Codes

Beyond HTTP status codes, the platform returns domain-specific error codes in the `error_code` field.

### Organization Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `provisioning_failed` | 500 | Organization provisioning encountered an error |
| `org_suspended` | 403 | Organization has been suspended |
| `org_not_found` | 404 | Organization does not exist |
| `plan_limit_reached` | 403 | Operation exceeds plan limits |

**Example** - `provisioning_failed`:

```json
{
  "detail": "Organization provisioning failed: unable to create Kubernetes namespace",
  "error_code": "provisioning_failed",
  "request_id": "req_prov_001",
  "retry_eligible": true
}
```

---

### Agent Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `agent_not_found` | 404 | Agent does not exist in this organization |
| `agent_frozen` | 409 | Agent is frozen and cannot accept operations |
| `agent_limit_reached` | 403 | Maximum agent count for plan reached |
| `agent_unhealthy` | 503 | Agent exists but is not responding |

**Example** - `agent_not_found`:

```json
{
  "detail": "Agent 'agt_unknown_001' does not exist in organization 'org_a1b2c3d4'",
  "error_code": "agent_not_found",
  "request_id": "req_agt_001"
}
```

**Example** - `agent_frozen`:

```json
{
  "detail": "Agent 'agt_fullstack_002' is frozen. Unfreeze it before assigning tasks.",
  "error_code": "agent_frozen",
  "request_id": "req_agt_002",
  "agent_id": "agt_fullstack_002"
}
```

---

### Task Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `task_not_found` | 404 | Task does not exist |
| `task_already_completed` | 409 | Task has already been completed |
| `task_not_assigned` | 403 | Agent is not assigned to this task |
| `invalid_task_transition` | 422 | Invalid status transition |

**Example** - `invalid_task_transition`:

```json
{
  "detail": "Cannot transition task from 'verified' to 'in_progress'",
  "error_code": "invalid_task_transition",
  "request_id": "req_tsk_001",
  "current_status": "verified",
  "requested_status": "in_progress"
}
```

---

### Billing Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `free_tier_exceeded` | 403 | Free tier usage limits exceeded |
| `payment_required` | 402 | Valid payment method required |
| `budget_exceeded` | 403 | Monthly budget limit reached |
| `subscription_inactive` | 403 | No active subscription |

**Example** - `free_tier_exceeded`:

```json
{
  "detail": "Free tier limit exceeded. You have used 100/100 API calls this month. Upgrade to continue.",
  "error_code": "free_tier_exceeded",
  "request_id": "req_bill_001",
  "usage": {
    "current": 100,
    "limit": 100,
    "unit": "api_calls"
  },
  "upgrade_url": "https://app.agent.ceo/billing/upgrade"
}
```

---

### Infrastructure Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `nats_unavailable` | 503 | NATS messaging service is unreachable |
| `database_error` | 500 | Database operation failed |
| `k8s_error` | 500 | Kubernetes operation failed |
| `timeout` | 504 | Operation timed out |

**Example** - `nats_unavailable`:

```json
{
  "detail": "NATS messaging service is temporarily unavailable. Agent communication may be delayed.",
  "error_code": "nats_unavailable",
  "request_id": "req_infra_001",
  "retry_after_seconds": 30
}
```

---

### Authentication Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `auth_required` | 401 | No authentication provided |
| `token_expired` | 401 | API key or token has expired |
| `token_revoked` | 401 | API key has been revoked |
| `insufficient_scope` | 403 | Key lacks required permission scope |
| `mfa_required` | 403 | Multi-factor authentication required |

**Example** - `mfa_required`:

```json
{
  "detail": "This operation requires multi-factor authentication. Complete MFA challenge first.",
  "error_code": "mfa_required",
  "request_id": "req_auth_001",
  "challenge_url": "/api/v1/mfa/challenge"
}
```

---

## Error Handling Best Practices

### Retry Strategy

Implement retries with exponential backoff for transient errors:

```python
import time
import requests

def api_call_with_retry(url, headers, max_retries=3):
    for attempt in range(max_retries):
        response = requests.get(url, headers=headers)

        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 10))
            time.sleep(retry_after)
            continue

        if response.status_code >= 500:
            time.sleep(2 ** attempt)
            continue

        return response

    raise Exception("Max retries exceeded")
```

### Retryable vs Non-Retryable

| Status | Retryable | Strategy |
|--------|-----------|----------|
| 400 | No | Fix request |
| 401 | No | Refresh credentials |
| 403 | No | Check permissions |
| 404 | No | Verify resource ID |
| 422 | No | Fix validation errors |
| 429 | Yes | Respect `Retry-After` |
| 500 | Yes | Exponential backoff |
| 502 | Yes | Retry after 5s |
| 503 | Yes | Respect `Retry-After` |

### Logging

Always log the `request_id` from error responses. This enables efficient debugging with the support team:

```python
if response.status_code >= 400:
    error = response.json()
    logger.error(
        f"API error: {error['detail']} "
        f"(code={error.get('error_code')}, "
        f"request_id={error['request_id']})"
    )
```

---

## Related Resources

- [REST API](./rest-api.md) for endpoint documentation
- [WebSocket API](./websocket-api.md) for WebSocket-specific close codes
- [MCP Catalog](./mcp-catalog.md) for MCP tool error handling
- [Event Types](./event-types.md) for event schema reference
