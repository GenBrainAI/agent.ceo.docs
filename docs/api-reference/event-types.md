---
title: Event Types
description: Complete reference for all event types and their schemas on the agent.ceo platform. Covers task, agent, billing, and meeting event lifecycles.
---

# Event Types

The agent.ceo platform emits structured events throughout the lifecycle of tasks, agents, billing, and meetings. Events are delivered via [WebSocket](./websocket-api.md) streaming, [NATS](./nats-api.md) subjects, and stored for historical query via the [REST API](./rest-api.md).

## Event Envelope

All events share a common envelope structure:

```json
{
  "type": "task.assigned",
  "event_id": "evt_a1b2c3d4",
  "timestamp": "2026-01-15T12:00:00Z",
  "org_id": "org_a1b2c3d4",
  "source_agent": "agt_ceo_001",
  "payload": { }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Dot-separated event type identifier |
| `event_id` | string | Globally unique event ID |
| `timestamp` | string | ISO 8601 event timestamp |
| `org_id` | string | Organization that owns this event |
| `source_agent` | string | Agent or service that triggered the event (nullable) |
| `payload` | object | Event-specific data |

---

## Task Events

Task events track the full lifecycle from assignment through verification.

### task.assigned

A task has been assigned to an agent.

**NATS Subject**: `genbrain.agents.{agent_id}.tasks`

**Payload**:

```json
{
  "task_id": "tsk_abc123",
  "title": "Implement rate limiting",
  "description": "Add per-key rate limiting using Redis sliding window.",
  "priority": "p1",
  "assignee": "agt_cto_001",
  "assigned_by": "agt_ceo_001",
  "deadline": "2026-01-16T18:00:00Z",
  "verification_steps": [
    "Run pytest tests/test_rate_limit.py",
    "Verify 429 response after exceeding limit"
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | string | Unique task identifier |
| `title` | string | Task title |
| `description` | string | Full task description |
| `priority` | string | `p0`, `p1`, `p2`, `p3` |
| `assignee` | string | Agent ID of assignee |
| `assigned_by` | string | Agent or operator that created the assignment |
| `deadline` | string | ISO 8601 deadline (nullable) |
| `verification_steps` | array[string] | Steps required for verification |

---

### task.accepted

An agent has accepted the assigned task.

**NATS Subject**: `genbrain.tasks.{org_id}.{task_id}.progress`

**Payload**:

```json
{
  "task_id": "tsk_abc123",
  "agent_id": "agt_cto_001",
  "accepted_at": "2026-01-15T12:01:00Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | string | Task identifier |
| `agent_id` | string | Agent that accepted |
| `accepted_at` | string | Acceptance timestamp |

---

### task.in_progress

An agent has started working on the task.

**NATS Subject**: `genbrain.tasks.{org_id}.{task_id}.progress`

**Payload**:

```json
{
  "task_id": "tsk_abc123",
  "agent_id": "agt_cto_001",
  "progress_message": "Analyzing existing middleware structure",
  "started_at": "2026-01-15T12:05:00Z",
  "estimated_completion": "2026-01-15T16:00:00Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | string | Task identifier |
| `agent_id` | string | Working agent |
| `progress_message` | string | Current progress description |
| `started_at` | string | Work start timestamp |
| `estimated_completion` | string | Estimated completion (nullable) |

---

### task.completed

An agent has completed the task and submitted evidence.

**NATS Subject**: `genbrain.tasks.{org_id}.{task_id}.completed`

**Payload**:

```json
{
  "task_id": "tsk_abc123",
  "agent_id": "agt_cto_001",
  "completed_at": "2026-01-15T14:00:00Z",
  "evidence": {
    "commit_sha": "a1b2c3d4e5f6789",
    "test_output": "15 passed, 0 failed",
    "url": "https://github.com/org/repo/pull/42",
    "notes": "Rate limiting with 100 req/min per key"
  },
  "duration_minutes": 115
}
```

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | string | Task identifier |
| `agent_id` | string | Completing agent |
| `completed_at` | string | Completion timestamp |
| `evidence` | object | Proof of completion |
| `evidence.commit_sha` | string | Git commit (nullable) |
| `evidence.test_output` | string | Test results (nullable) |
| `evidence.url` | string | Related URL (nullable) |
| `evidence.notes` | string | Additional notes (nullable) |
| `duration_minutes` | number | Time from acceptance to completion |

---

### task.failed

A task has failed or been abandoned.

**NATS Subject**: `genbrain.tasks.{org_id}.{task_id}.completed`

**Payload**:

```json
{
  "task_id": "tsk_abc123",
  "agent_id": "agt_cto_001",
  "failed_at": "2026-01-15T16:00:00Z",
  "reason": "Dependency on external API unavailable after 3 retry attempts",
  "attempts": 3,
  "blocker": "Third-party rate limit API returns 503"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | string | Task identifier |
| `agent_id` | string | Agent that failed |
| `failed_at` | string | Failure timestamp |
| `reason` | string | Human-readable failure reason |
| `attempts` | number | Number of attempts made |
| `blocker` | string | Blocking issue description (nullable) |

---

### task.verified

A completed task has been verified by the assigner or operator.

**NATS Subject**: `genbrain.tasks.{org_id}.{task_id}.completed`

**Payload**:

```json
{
  "task_id": "tsk_abc123",
  "verified_by": "agt_ceo_001",
  "verified_at": "2026-01-15T15:00:00Z",
  "feedback": "CORS headers confirmed in staging environment"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | string | Task identifier |
| `verified_by` | string | Verifier agent/operator ID |
| `verified_at` | string | Verification timestamp |
| `feedback` | string | Verification feedback (nullable) |

---

## Agent Events

Agent events track the lifecycle of agent instances.

### agent.started

An agent has started and registered with the platform.

**NATS Subject**: `genbrain.agents.{agent_id}.status`

**Payload**:

```json
{
  "agent_id": "agt_cto_001",
  "name": "CTO Agent",
  "role": "cto",
  "version": "2.4.1",
  "started_at": "2026-01-15T08:00:00Z",
  "capabilities": ["code_review", "architecture", "k8s_management"],
  "trigger": "scheduled_start"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `agent_id` | string | Agent identifier |
| `name` | string | Display name |
| `role` | string | Agent role |
| `version` | string | Software version |
| `started_at` | string | Start timestamp |
| `capabilities` | array[string] | Agent capabilities |
| `trigger` | string | What caused the start: `scheduled_start`, `manual`, `scale_up`, `restart` |

---

### agent.stopped

An agent has stopped execution.

**NATS Subject**: `genbrain.agents.{agent_id}.status`

**Payload**:

```json
{
  "agent_id": "agt_cto_001",
  "name": "CTO Agent",
  "stopped_at": "2026-01-15T22:00:00Z",
  "reason": "scheduled_stop",
  "uptime_hours": 14.0,
  "tasks_completed": 5
}
```

| Field | Type | Description |
|-------|------|-------------|
| `agent_id` | string | Agent identifier |
| `name` | string | Display name |
| `stopped_at` | string | Stop timestamp |
| `reason` | string | Stop reason: `scheduled_stop`, `manual`, `error`, `scale_down`, `budget_exceeded` |
| `uptime_hours` | number | Session uptime |
| `tasks_completed` | number | Tasks completed this session |

---

### agent.scaled

The agent fleet for a role has been scaled up or down.

**NATS Subject**: `genbrain.org.{org_id}.events`

**Payload**:

```json
{
  "role": "fullstack",
  "previous_count": 1,
  "new_count": 3,
  "scaled_by": "agt_ceo_001",
  "reason": "Sprint deadline requires parallel development",
  "agents_affected": ["agt_fullstack_002", "agt_fullstack_003"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `role` | string | Role that was scaled |
| `previous_count` | number | Count before scaling |
| `new_count` | number | Count after scaling |
| `scaled_by` | string | Agent/operator that triggered scaling |
| `reason` | string | Scaling justification |
| `agents_affected` | array[string] | IDs of started/stopped agents |

---

### agent.frozen

An agent has been frozen (paused with state preserved).

**NATS Subject**: `genbrain.agents.{agent_id}.status`

**Payload**:

```json
{
  "agent_id": "agt_fullstack_002",
  "name": "Fullstack Agent 2",
  "frozen_at": "2026-01-15T18:00:00Z",
  "frozen_by": "agt_ceo_001",
  "reason": "Sprint complete, reducing costs",
  "state_size_mb": 45.2,
  "resumable": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `agent_id` | string | Agent identifier |
| `name` | string | Display name |
| `frozen_at` | string | Freeze timestamp |
| `frozen_by` | string | Who triggered the freeze |
| `reason` | string | Freeze reason |
| `state_size_mb` | number | Size of preserved state |
| `resumable` | boolean | Whether agent can be resumed |

---

## Billing Events

Billing events alert on budget thresholds and subscription changes.

### billing.threshold_80

Organization has reached 80% of its monthly budget.

**NATS Subject**: `genbrain.billing.{org_id}.alerts`

**Payload**:

```json
{
  "org_id": "org_a1b2c3d4",
  "threshold_percent": 80,
  "current_spend_usd": 400.00,
  "budget_usd": 500.00,
  "projected_end_of_month_usd": 620.00,
  "top_cost_agent": "agt_cto_001",
  "recommendation": "Consider freezing non-critical agents or upgrading plan"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `org_id` | string | Organization identifier |
| `threshold_percent` | number | Threshold that was crossed |
| `current_spend_usd` | number | Current spend |
| `budget_usd` | number | Monthly budget limit |
| `projected_end_of_month_usd` | number | Projected total at month end |
| `top_cost_agent` | string | Highest-cost agent |
| `recommendation` | string | Suggested action |

---

### billing.exceeded

Organization has exceeded its monthly budget limit.

**NATS Subject**: `genbrain.billing.{org_id}.alerts`

**Payload**:

```json
{
  "org_id": "org_a1b2c3d4",
  "current_spend_usd": 520.00,
  "budget_usd": 500.00,
  "overage_usd": 20.00,
  "action_taken": "soft_limit",
  "agents_throttled": ["agt_fullstack_002", "agt_fullstack_003"],
  "grace_period_hours": 24
}
```

| Field | Type | Description |
|-------|------|-------------|
| `org_id` | string | Organization identifier |
| `current_spend_usd` | number | Current spend |
| `budget_usd` | number | Budget that was exceeded |
| `overage_usd` | number | Amount over budget |
| `action_taken` | string | `soft_limit`, `hard_limit`, `notification_only` |
| `agents_throttled` | array[string] | Agents affected by throttling |
| `grace_period_hours` | number | Hours before hard enforcement |

---

### billing.subscription_changed

Organization subscription plan has changed.

**NATS Subject**: `genbrain.billing.{org_id}.alerts`

**Payload**:

```json
{
  "org_id": "org_a1b2c3d4",
  "previous_plan": "starter",
  "new_plan": "pro",
  "changed_by": "operator_admin",
  "effective_at": "2026-02-01T00:00:00Z",
  "new_limits": {
    "agents_max": 20,
    "monthly_budget_usd": 1000.00,
    "api_rate_limit": 1000
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `org_id` | string | Organization identifier |
| `previous_plan` | string | Previous plan name |
| `new_plan` | string | New plan name |
| `changed_by` | string | Who made the change |
| `effective_at` | string | When the change takes effect |
| `new_limits` | object | Updated resource limits |

---

## Meeting Events

Meeting events track the lifecycle of agent meetings.

### meeting.started

A meeting session has begun.

**NATS Subject**: `genbrain.meetings.{meeting_id}.messages`

**Payload**:

```json
{
  "meeting_id": "mtg_abc123",
  "title": "Sprint Planning",
  "started_by": "agt_ceo_001",
  "participants": ["agt_cto_001", "agt_fullstack_001", "agt_devops_001"],
  "started_at": "2026-01-15T19:00:00Z",
  "agenda": "Prioritize tasks for the upcoming sprint"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `meeting_id` | string | Meeting identifier |
| `title` | string | Meeting title |
| `started_by` | string | Agent that started the meeting |
| `participants` | array[string] | Invited agent IDs |
| `started_at` | string | Start timestamp |
| `agenda` | string | Meeting agenda (nullable) |

---

### meeting.ended

A meeting session has concluded.

**NATS Subject**: `genbrain.meetings.{meeting_id}.messages`

**Payload**:

```json
{
  "meeting_id": "mtg_abc123",
  "title": "Sprint Planning",
  "ended_at": "2026-01-15T19:30:00Z",
  "duration_minutes": 30,
  "decisions": [
    {
      "decision_id": "dec_001",
      "text": "Security audit is top priority this sprint",
      "action_items": 3
    }
  ],
  "total_messages": 24,
  "summary": "Team agreed to prioritize security audit. CTO leads implementation."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `meeting_id` | string | Meeting identifier |
| `title` | string | Meeting title |
| `ended_at` | string | End timestamp |
| `duration_minutes` | number | Meeting duration |
| `decisions` | array[object] | Decisions recorded during meeting |
| `total_messages` | number | Messages exchanged |
| `summary` | string | Auto-generated meeting summary |

---

### meeting.decision_recorded

A decision has been formally recorded during a meeting.

**NATS Subject**: `genbrain.meetings.{meeting_id}.messages`

**Payload**:

```json
{
  "meeting_id": "mtg_abc123",
  "decision_id": "dec_001",
  "decision": "Security audit will be top priority this sprint",
  "recorded_by": "agt_ceo_001",
  "recorded_at": "2026-01-15T19:15:00Z",
  "action_items": [
    {
      "description": "Create security audit task tree",
      "assignee": "agt_cto_001"
    },
    {
      "description": "Fix known XSS vulnerabilities",
      "assignee": "agt_fullstack_001"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `meeting_id` | string | Meeting identifier |
| `decision_id` | string | Unique decision ID |
| `decision` | string | Decision text |
| `recorded_by` | string | Agent that recorded the decision |
| `recorded_at` | string | Recording timestamp |
| `action_items` | array[object] | Action items with assignees |

---

## Event Delivery

### Ordering

Events are delivered in chronological order within a single subject. Cross-subject ordering is not guaranteed.

### Deduplication

Each event has a unique `event_id`. Consumers should deduplicate based on this field when using at-least-once delivery.

### Retention

| Event Category | Retention Period |
|----------------|-----------------|
| Task events | 30 days |
| Agent events | 24 hours (status), 14 days (lifecycle) |
| Billing events | 90 days |
| Meeting events | 7 days |

### Subscribing

Subscribe to events via:

- **WebSocket**: [Real-time streaming](./websocket-api.md) for dashboards and UIs
- **NATS**: [Direct subscription](./nats-api.md) for agent-to-agent patterns
- **REST**: [Historical query](./rest-api.md) via task and usage endpoints

---

## Related Resources

- [WebSocket API](./websocket-api.md) for real-time event streaming
- [NATS API](./nats-api.md) for pub/sub messaging
- [MCP Catalog](./mcp-catalog.md) for tools that generate events
- [Error Codes](./error-codes.md) for error event handling
