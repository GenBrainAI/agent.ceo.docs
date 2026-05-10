---
title: WebSocket API
description: Real-time event streaming via WebSocket connections. Subscribe to agent status changes, task updates, and billing alerts.
---

# WebSocket API

The agent.ceo platform provides real-time event streaming over WebSocket connections. Use this API to receive instant notifications about agent activity, task state changes, and billing alerts without polling.

## Connection

### Endpoint

```
wss://api.agent.ceo/api/v1/events/stream
```

### Authentication

Authenticate by passing your API key as a query parameter or in the first message after connection:

**Query parameter method** (recommended):

```
wss://api.agent.ceo/api/v1/events/stream?token=ak_live_xxxxxxxxxxxx
```

**First-message method**:

```json
{
  "type": "auth",
  "token": "ak_live_xxxxxxxxxxxx"
}
```

The server responds with an authentication confirmation:

```json
{
  "type": "auth.success",
  "timestamp": "2026-01-15T12:00:00Z",
  "connection_id": "conn_abc123",
  "org_id": "org_a1b2c3d4"
}
```

If authentication fails, the server sends an error and closes the connection:

```json
{
  "type": "auth.failed",
  "detail": "Invalid or expired API key",
  "code": 4001
}
```

---

## Subscription

After authenticating, subscribe to specific event types or channels:

### Subscribe to Event Types

```json
{
  "type": "subscribe",
  "channels": [
    "agent.status_change",
    "task.update",
    "billing.alert"
  ]
}
```

**Response**:

```json
{
  "type": "subscribe.success",
  "channels": [
    "agent.status_change",
    "task.update",
    "billing.alert"
  ],
  "timestamp": "2026-01-15T12:00:01Z"
}
```

### Subscribe to Specific Agents

Filter events for specific agents:

```json
{
  "type": "subscribe",
  "channels": ["task.update"],
  "filters": {
    "agent_id": ["agt_cto_001", "agt_fullstack_001"]
  }
}
```

### Unsubscribe

```json
{
  "type": "unsubscribe",
  "channels": ["billing.alert"]
}
```

---

## Event Format

All events follow a consistent JSON envelope format:

```json
{
  "type": "task.update",
  "event_id": "evt_xyz789",
  "timestamp": "2026-01-15T12:30:00Z",
  "org_id": "org_a1b2c3d4",
  "payload": {
    "task_id": "tsk_def456",
    "status": "completed",
    "agent_id": "agt_cto_001"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Event type identifier (dot-separated) |
| `event_id` | string | Unique event identifier for deduplication |
| `timestamp` | string | ISO 8601 timestamp when event occurred |
| `org_id` | string | Organization the event belongs to |
| `payload` | object | Event-specific data (varies by type) |

---

## Event Types

### agent.status_change

Fired when an agent transitions between states.

```json
{
  "type": "agent.status_change",
  "event_id": "evt_001",
  "timestamp": "2026-01-15T12:30:00Z",
  "org_id": "org_a1b2c3d4",
  "payload": {
    "agent_id": "agt_cto_001",
    "agent_name": "CTO Agent",
    "previous_status": "running",
    "new_status": "stopped",
    "reason": "manual_stop"
  }
}
```

**Possible status values**: `starting`, `running`, `stopped`, `frozen`, `error`

---

### task.update

Fired when a task changes status, receives progress, or is reassigned.

```json
{
  "type": "task.update",
  "event_id": "evt_002",
  "timestamp": "2026-01-15T12:35:00Z",
  "org_id": "org_a1b2c3d4",
  "payload": {
    "task_id": "tsk_def456",
    "title": "Add rate limiting to API gateway",
    "previous_status": "in_progress",
    "new_status": "completed",
    "agent_id": "agt_cto_001",
    "evidence": {
      "commit_sha": "a1b2c3d4e5f6",
      "test_result": "12 passed, 0 failed"
    }
  }
}
```

---

### billing.alert

Fired when billing thresholds are crossed or anomalies detected.

```json
{
  "type": "billing.alert",
  "event_id": "evt_003",
  "timestamp": "2026-01-15T12:40:00Z",
  "org_id": "org_a1b2c3d4",
  "payload": {
    "alert_type": "threshold_80",
    "current_spend_usd": 400.00,
    "limit_usd": 500.00,
    "percent_used": 80,
    "message": "You have used 80% of your monthly budget"
  }
}
```

**Alert types**: `threshold_80`, `threshold_95`, `exceeded`, `anomaly_detected`

---

## Heartbeat and Connection Management

### Server Ping

The server sends a ping frame every 30 seconds to keep the connection alive:

```json
{
  "type": "ping",
  "timestamp": "2026-01-15T12:30:30Z"
}
```

Clients should respond with a pong:

```json
{
  "type": "pong"
}
```

!!! note
    If the server receives no pong within 60 seconds, it closes the connection. Most WebSocket client libraries handle ping/pong frames automatically at the protocol level.

### Connection Limits

| Plan | Max Connections | Max Subscriptions |
|------|----------------|-------------------|
| Free | 1 | 3 |
| Starter | 5 | 10 |
| Pro | 20 | 50 |
| Enterprise | 100 | Unlimited |

---

## Reconnection

When disconnected, implement exponential backoff reconnection:

1. Wait 1 second, then attempt reconnection
2. On failure, double the wait time (2s, 4s, 8s, ...)
3. Cap maximum wait at 60 seconds
4. After reconnection, re-subscribe to all channels

### Missed Events

Upon reconnection, request events you may have missed:

```json
{
  "type": "replay",
  "since": "2026-01-15T12:30:00Z",
  "channels": ["task.update"]
}
```

The server replays up to 100 events from the last hour. Events older than 1 hour are not available for replay. For full event history, use the [REST API](./rest-api.md) task and usage endpoints.

---

## Client Examples

### JavaScript

```javascript
const ws = new WebSocket(
  'wss://api.agent.ceo/api/v1/events/stream?token=ak_live_xxx'
);

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['agent.status_change', 'task.update']
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong' }));
    return;
  }
  console.log(`Event: ${data.type}`, data.payload);
};

ws.onclose = (event) => {
  console.log(`Disconnected: ${event.code} ${event.reason}`);
  // Implement reconnection logic
};
```

### Python

```python
import asyncio
import json
import websockets

async def stream_events():
    uri = "wss://api.agent.ceo/api/v1/events/stream?token=ak_live_xxx"
    async with websockets.connect(uri) as ws:
        await ws.send(json.dumps({
            "type": "subscribe",
            "channels": ["task.update", "billing.alert"]
        }))

        async for message in ws:
            event = json.loads(message)
            if event["type"] == "ping":
                await ws.send(json.dumps({"type": "pong"}))
                continue
            print(f"Event: {event['type']}")
            print(f"Payload: {event['payload']}")

asyncio.run(stream_events())
```

---

## Error Codes

WebSocket-specific close codes:

| Code | Reason | Description |
|------|--------|-------------|
| 4001 | `auth_failed` | Invalid or expired API key |
| 4002 | `subscription_limit` | Too many subscriptions for plan |
| 4003 | `connection_limit` | Too many concurrent connections |
| 4004 | `rate_limited` | Sending messages too quickly |
| 4005 | `org_suspended` | Organization has been suspended |

---

## Related Resources

- [REST API](./rest-api.md) for request/response endpoints
- [Event Types](./event-types.md) for complete event schema reference
- [NATS API](./nats-api.md) for inter-agent messaging
- [Error Codes](./error-codes.md) for HTTP error handling
