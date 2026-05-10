---
title: "Connecting External MCP Servers"
description: "Guide for adding third-party and custom MCP servers to agent.ceo agents — configuration, authentication, networking, troubleshooting, and practical examples."
---

# Connecting External MCP Servers

This guide covers how to connect third-party and custom MCP servers to your agent.ceo agents. Whether you are integrating a Slack bot, a database interface, or a custom internal tool, this document explains the configuration, authentication, networking, and troubleshooting steps.

## Overview

agent.ceo agents can connect to any MCP-compliant server. The platform ships with built-in MCP servers (agent-hub, Playwright, Gmail, etc.), but you can extend an agent's capabilities by adding external MCP servers.

```mermaid
graph TB
    subgraph "Agent Pod"
        A[Claude Code Agent]
        A -->|stdio| B1[agent-hub MCP]
        A -->|stdio| B2[Playwright MCP]
        A -->|stdio| B3[Custom MCP - stdio]
        A -->|SSE| B4[External MCP - SSE]
    end

    subgraph "Platform Services"
        B1 --> C1[Task Engine]
    end

    subgraph "External"
        B4 --> D1[Slack API]
        B3 --> D2[Internal Database]
    end

    style A fill:#4A90D9,color:#fff
    style B3 fill:#9B59B6,color:#fff
    style B4 fill:#E67E22,color:#fff
```

## Configuration

MCP servers are configured in the agent's settings files. There are two configuration locations, depending on scope:

### Project-Level Configuration

For MCP servers specific to a particular agent or project, configure in `.claude/settings.json` within the agent's working directory:

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
        "SLACK_TEAM_ID": "T0123456789"
      }
    }
  }
}
```

### User-Level Configuration

For MCP servers available to all projects for a given agent, configure in `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "database": {
      "command": "node",
      "args": ["/opt/mcp-servers/database/index.js"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    }
  }
}
```

### Configuration Fields

| Field | Transport | Required | Description |
|-------|-----------|----------|-------------|
| `command` | stdio | Yes | Executable to run (e.g., `node`, `npx`, `python`) |
| `args` | stdio | No | Arguments passed to the command |
| `env` | stdio | No | Environment variables for the server process |
| `cwd` | stdio | No | Working directory for the server process |
| `url` | SSE | Yes | URL of the remote MCP server endpoint |
| `headers` | SSE | No | HTTP headers (e.g., Authorization) |

!!! note "Environment variable interpolation"
    Values wrapped in `${...}` are interpolated from the agent's environment at startup. This lets you reference secrets injected by Kubernetes without hardcoding them.

## Authentication Patterns

Different external services require different authentication approaches. Here are the most common patterns.

### API Key Authentication

The simplest pattern. The API key is injected as an environment variable and the MCP server includes it in requests to the upstream service.

```json
{
  "mcpServers": {
    "openai": {
      "command": "node",
      "args": ["/opt/mcp-servers/openai/index.js"],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}"
      }
    }
  }
}
```

The MCP server reads the key from its environment:

```typescript
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}
```

### OAuth 2.0 Authentication

For services that use OAuth (Google, Slack, Microsoft), the MCP server manages the token lifecycle.

```mermaid
sequenceDiagram
    participant Agent as Agent
    participant MCP as MCP Server
    participant Auth as OAuth Provider
    participant API as Service API

    Agent->>MCP: call tool
    MCP->>MCP: Check for valid token
    alt Token expired
        MCP->>Auth: Refresh token
        Auth-->>MCP: New access token
    end
    MCP->>API: Request with Bearer token
    API-->>MCP: Response
    MCP-->>Agent: Tool result
```

Configuration with OAuth credentials:

```json
{
  "mcpServers": {
    "google-drive": {
      "command": "node",
      "args": ["/opt/mcp-servers/google-drive/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "${GOOGLE_CLIENT_ID}",
        "GOOGLE_CLIENT_SECRET": "${GOOGLE_CLIENT_SECRET}",
        "GOOGLE_REFRESH_TOKEN": "${GOOGLE_REFRESH_TOKEN}"
      }
    }
  }
}
```

### JWT / Service Account Authentication

For internal services that use JWT-based auth:

```json
{
  "mcpServers": {
    "internal-api": {
      "command": "node",
      "args": ["/opt/mcp-servers/internal-api/index.js"],
      "env": {
        "SERVICE_ACCOUNT_KEY": "${SERVICE_ACCOUNT_KEY_JSON}",
        "JWT_ISSUER": "agent-ceo-platform"
      }
    }
  }
}
```

### Kubernetes Service Account

For MCP servers that need to access Kubernetes APIs:

```json
{
  "mcpServers": {
    "k8s-tools": {
      "command": "node",
      "args": ["/opt/mcp-servers/k8s/index.js"],
      "env": {
        "KUBECONFIG": "/var/run/secrets/kubernetes.io/serviceaccount/token"
      }
    }
  }
}
```

!!! danger "Never hardcode credentials"
    Always use environment variable interpolation (`${VAR_NAME}`) or Kubernetes secrets. Never commit credentials to configuration files. Use `store_credential` from agent-hub to manage secrets securely.

## Network Requirements

### stdio Transport (Co-located)

For stdio-based MCP servers, there are no special network requirements because the server runs as a child process of the agent. However, the server itself may need network access to reach upstream services.

```mermaid
graph LR
    subgraph "Agent Pod"
        A[Agent] -->|stdio| B[MCP Server]
    end
    B -->|HTTPS| C[External API]
    
    style A fill:#4A90D9,color:#fff
    style B fill:#2ECC71,color:#fff
    style C fill:#E74C3C,color:#fff
```

Ensure the agent pod's network policies allow egress to the external API.

### SSE Transport (Remote)

For SSE-based MCP servers running as separate services, the agent pod must be able to reach the MCP server over the network.

**Within the same Kubernetes cluster:**

```
http://mcp-server-name.namespace.svc.cluster.local:PORT/sse
```

**External MCP server:**

```
https://mcp.external-service.com/sse
```

!!! warning "Firewall and NetworkPolicy"
    If your Kubernetes cluster uses NetworkPolicies, you must explicitly allow egress from agent pods to MCP server pods or external endpoints. Verify with:
    ```bash
    kubectl get networkpolicy -n agent-ceo
    ```

### DNS Resolution

MCP servers referenced by hostname must be resolvable from the agent pod. For cluster-internal services, use the full Kubernetes DNS name. For external services, ensure the cluster's DNS can resolve external domains.

## Integration Examples

### Example 1: Connecting a Slack MCP Server

Slack integration allows agents to read channels, send messages, and manage threads.

**Step 1: Install the MCP server package**

```bash
npm install @anthropic/mcp-server-slack
```

**Step 2: Create a Slack App and Bot Token**

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create a new app with Bot Token Scopes: `channels:read`, `chat:write`, `users:read`
3. Install to your workspace and copy the Bot Token

**Step 3: Store the credential**

```python
store_credential(
    name="slack_bot_token",
    value="xoxb-your-bot-token-here",
    description="Slack Bot Token for agent notifications"
)
```

**Step 4: Configure the MCP server**

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
        "SLACK_TEAM_ID": "T0123456789"
      }
    }
  }
}
```

**Step 5: Verify**

After restarting the agent, the Slack tools should appear in the agent's tool list. Test with:

```python
# List channels
slack_list_channels()

# Send a message
slack_send_message(channel="C0123456789", text="Hello from agent.ceo!")
```

### Example 2: Connecting a Database MCP Server

Access a PostgreSQL database for querying application data.

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${DATABASE_URL}"
      }
    }
  }
}
```

!!! warning "Read-only access recommended"
    For safety, configure database MCP servers with read-only database credentials. Agents should not be able to modify production data through ad-hoc queries. Use dedicated MCP tools with proper validation for write operations.

### Example 3: Connecting Custom Internal Tools

Suppose your organization has an internal deployment service with a REST API. You can wrap it in an MCP server.

**Step 1: Build the MCP server** (see [Building Custom MCP Servers](mcp-for-developers.md))

**Step 2: Package as a Docker image**

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
ENTRYPOINT ["node", "dist/index.js"]
```

**Step 3: Deploy as a sidecar or standalone service**

For sidecar deployment, add the MCP server binary to the agent's container:

```json
{
  "mcpServers": {
    "deploy-service": {
      "command": "node",
      "args": ["/opt/mcp-servers/deploy-service/dist/index.js"],
      "env": {
        "DEPLOY_API_URL": "https://deploy.internal.example.com",
        "DEPLOY_API_TOKEN": "${DEPLOY_API_TOKEN}"
      }
    }
  }
}
```

### Example 4: Connecting a Remote SSE-based MCP Server

For shared MCP servers running as independent services:

```json
{
  "mcpServers": {
    "analytics": {
      "url": "http://analytics-mcp.data-team.svc.cluster.local:8080/sse",
      "headers": {
        "Authorization": "Bearer ${ANALYTICS_MCP_TOKEN}",
        "X-Agent-Name": "${AGENT_NAME}"
      }
    }
  }
}
```

## Managing MCP Server Lifecycle

### Startup Order

MCP servers start when the Claude Code agent initializes. If an MCP server fails to start, the agent will log a warning but continue operating without those tools.

```mermaid
sequenceDiagram
    participant Agent as Claude Code
    participant MCP1 as agent-hub
    participant MCP2 as Playwright
    participant MCP3 as Custom MCP

    Agent->>MCP1: Initialize (stdio)
    MCP1-->>Agent: Tools registered (42 tools)
    Agent->>MCP2: Initialize (stdio)
    MCP2-->>Agent: Tools registered (18 tools)
    Agent->>MCP3: Initialize (stdio)
    MCP3--xAgent: Connection failed
    Agent->>Agent: Continue without Custom MCP tools
    Note over Agent: Agent operates with agent-hub + Playwright tools
```

### Health Checks

For SSE-based MCP servers, implement a health check endpoint:

```typescript
// In your SSE MCP server
app.get("/health", (req, res) => {
  res.json({ status: "healthy", tools: server.getToolCount() });
});
```

### Graceful Shutdown

MCP servers should handle SIGTERM gracefully:

```typescript
process.on("SIGTERM", async () => {
  console.error("Received SIGTERM, shutting down gracefully...");
  await server.close();
  process.exit(0);
});
```

## Troubleshooting

### Common Issues

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Tools not appearing | MCP server failed to start | Check agent logs for startup errors |
| "Connection refused" | SSE server not reachable | Verify network policy and service DNS |
| "Authentication failed" | Missing or expired credentials | Verify env vars with `echo $VAR_NAME` |
| Tools appear but fail | Backend service unreachable | Check MCP server's connectivity to upstream |
| Intermittent timeouts | MCP server overloaded | Add replicas for SSE servers, check resource limits |
| "Unknown tool" | Tool name mismatch | Check the tool name in the MCP server matches what the agent is calling |

### Debugging Steps

**1. Check if the MCP server process is running:**

```bash
ps aux | grep mcp-server
```

**2. Check MCP server stderr for errors:**

MCP servers using stdio transport write logs to stderr. Check the agent's log output for lines from the MCP server.

**3. Test the MCP server independently:**

```bash
# For stdio servers
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | node /path/to/server.js

# For SSE servers
curl http://localhost:3001/sse
```

**4. Verify environment variables:**

```bash
# Inside the agent pod
env | grep SLACK
env | grep DATABASE
```

**5. Test network connectivity:**

```bash
# Can the agent pod reach the MCP server?
curl -v http://mcp-server.namespace.svc.cluster.local:3001/health

# Can the MCP server reach the upstream API?
curl -v https://api.external-service.com/health
```

!!! tip "Use `browser_console_messages` for Playwright issues"
    If Playwright MCP tools are failing, use `browser_console_messages` to check for JavaScript errors in the browser context. For network-related browser failures, use `browser_network_requests`.

### Log Levels

Most MCP servers support a `LOG_LEVEL` environment variable:

```json
{
  "mcpServers": {
    "custom": {
      "command": "node",
      "args": ["/opt/mcp-servers/custom/index.js"],
      "env": {
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

## Best Practices

1. **Start with stdio, move to SSE when needed** — stdio is simpler and faster. Only use SSE when you need to share a server across agents.

2. **Pin MCP server versions** — Avoid `@latest` in production. Use specific versions to prevent unexpected changes.

3. **Test locally first** — Use the MCP inspector (`npx @modelcontextprotocol/inspector`) before deploying to production.

4. **Monitor MCP server health** — Set up alerts for MCP server crashes, high latency, or error rates.

5. **Document your tools** — Write clear descriptions for every tool. The agent's ability to use a tool correctly depends heavily on the description quality.

6. **Use credential management** — Store secrets through `store_credential` and reference them via environment variable interpolation. Never commit secrets to config files.

7. **Apply least privilege** — Only expose the tools and permissions that agents actually need. Restrict database access to read-only where possible.

## See Also

- **[MCP Overview](agent-ceo-mcp-overview.md)** — Architecture and concepts
- **[Building Custom MCP Servers](mcp-for-developers.md)** — Create your own MCP server
- **[MCP Security Model](mcp-security.md)** — Security and permissions
- **[MCP Tool Catalog](mcp-tool-catalog.md)** — Built-in tool reference
