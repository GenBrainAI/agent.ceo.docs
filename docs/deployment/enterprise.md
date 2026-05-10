---
title: Enterprise Private Installation
description: Deploy agent.ceo in your own cloud account with full data sovereignty, custom networking, and bring-your-own-LLM support.
---

# Enterprise Private Installation

Deploy the full agent.ceo platform in your own AWS, GCP, or Azure account. Enterprise installations give you complete control over data, networking, and LLM provider configuration while receiving the same platform capabilities as the hosted SaaS offering.

## Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Kubernetes | 1.28+ | 1.30+ (GKE, EKS, or AKS) |
| Nodes | 3 nodes, 4 vCPU / 16 GB each | 6+ nodes with dedicated agent pool |
| Storage | 100 GB SSD | 500 GB SSD (Neo4j + agent workspaces) |
| Networking | Load balancer, DNS control | Private VPC with NAT gateway |
| LLM access | Anthropic API key | Dedicated Anthropic/OpenAI endpoint |

## Architecture Overview

Enterprise deployments mirror the SaaS architecture but run entirely within your infrastructure:

```
your-domain.com
    ├── api.agents.yourcompany.com    → Gateway (FastAPI)
    ├── app.agents.yourcompany.com    → Web Dashboard
    ├── nats.agents.yourcompany.com   → NATS JetStream (internal)
    └── neo4j.agents.yourcompany.com  → Neo4j (internal)
```

Each enterprise customer gets a dedicated Gateway instance, isolated Kubernetes namespace, and private data stores.

## Installation

### Step 1: Obtain Enterprise License

Contact [enterprise@agent.ceo](mailto:enterprise@agent.ceo) to receive:

- Enterprise license key
- Helm chart registry credentials
- Installation support from a named account engineer

### Step 2: Configure Helm Values

Create a `values-enterprise.yaml` file:

```yaml
global:
  license:
    key: "lic_ent_xxxxxxxxxxxxxxxxxxxxx"
  domain: "agents.yourcompany.com"
  clusterName: "agent-ceo-production"

gateway:
  replicas: 2
  domain: "api.agents.yourcompany.com"
  tls:
    enabled: true
    issuer: "letsencrypt-prod"  # or your internal CA
  auth:
    provider: "firebase"  # or "oidc" for custom IdP
    firebase:
      projectId: "your-firebase-project"
    oidc:
      issuerUrl: "https://auth.yourcompany.com"
      clientId: "agent-ceo-client"
      audience: "agent-ceo-api"

conductor:
  replicas: 2

nats:
  replicas: 3
  jetstream:
    storage: 50Gi
    storageClass: "ssd"

neo4j:
  mode: "standalone"  # or "cluster" for HA
  storage: 100Gi
  password:
    secretName: "neo4j-credentials"
    key: "password"

firestore:
  projectId: "your-gcp-project"
  # For AWS/Azure, use Firestore emulator or DynamoDB adapter:
  # adapter: "dynamodb"
  # dynamodb:
  #   region: "us-east-1"
  #   tableName: "agent-ceo-state"

agents:
  namespace: "agents"
  nodeSelector:
    pool: "agent-workloads"
  resources:
    requests:
      cpu: "2"
      memory: "8Gi"
    limits:
      cpu: "4"
      memory: "16Gi"

llm:
  provider: "anthropic"  # anthropic, openai, azure-openai
  anthropic:
    apiKey:
      secretName: "llm-credentials"
      key: "anthropic-api-key"
    # For dedicated endpoints:
    # baseUrl: "https://anthropic.internal.yourcompany.com"
  # openai:
  #   apiKey:
  #     secretName: "llm-credentials"
  #     key: "openai-api-key"
  #   baseUrl: "https://api.openai.com/v1"
  # azureOpenai:
  #   endpoint: "https://your-resource.openai.azure.com"
  #   apiKey:
  #     secretName: "llm-credentials"
  #     key: "azure-openai-key"
  #   deploymentName: "gpt-4o"

billing:
  mode: "enterprise"  # Disables Stripe, uses license-based metering
  reportingEndpoint: "https://telemetry.agent.ceo/v1/usage"
  # Set to "" for air-gapped (usage tracked locally only):
  # reportingEndpoint: ""

monitoring:
  prometheus:
    enabled: true
    serviceMonitor: true
  grafana:
    enabled: false  # Use your existing Grafana
    dashboardExport: true
```

### Step 3: Install via Helm

```bash
# Add the agent.ceo Helm repository
helm repo add agent-ceo https://charts.agent.ceo \
  --username enterprise \
  --password "$HELM_REGISTRY_TOKEN"
helm repo update

# Create namespace
kubectl create namespace agent-ceo-system

# Install secrets first
kubectl create secret generic llm-credentials \
  --namespace agent-ceo-system \
  --from-literal=anthropic-api-key="$ANTHROPIC_API_KEY"

kubectl create secret generic neo4j-credentials \
  --namespace agent-ceo-system \
  --from-literal=password="$NEO4J_PASSWORD"

# Install the platform
helm install agent-ceo agent-ceo/agent-ceo-platform \
  --namespace agent-ceo-system \
  --values values-enterprise.yaml \
  --wait --timeout 10m
```

### Step 4: Verify Installation

```bash
# Check all pods are running
kubectl get pods -n agent-ceo-system

# Verify Gateway health
curl -s https://api.agents.yourcompany.com/health | jq .

# Expected response:
# {
#   "status": "healthy",
#   "version": "2.4.0",
#   "components": {
#     "gateway": "ok",
#     "nats": "ok",
#     "neo4j": "ok",
#     "firestore": "ok"
#   }
# }

# Provision your first organization
curl -X POST https://api.agents.yourcompany.com/api/v1/organizations/provision \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Organization",
    "admin_email": "admin@yourcompany.com",
    "plan": "enterprise"
  }'
```

## Networking

### Private Deployment (No Public Internet)

For air-gapped or private-network deployments:

```yaml
# values-enterprise.yaml additions
global:
  airgapped: true

gateway:
  service:
    type: "ClusterIP"  # No external LB
    # Use internal ingress controller:
  ingress:
    className: "nginx-internal"
    annotations:
      nginx.ingress.kubernetes.io/ssl-passthrough: "true"

billing:
  reportingEndpoint: ""  # Disable telemetry

llm:
  anthropic:
    baseUrl: "https://anthropic-proxy.internal:8443"
```

### Network Policies

The Helm chart installs Kubernetes NetworkPolicies that:

- Restrict agent pods to communicating only with NATS and Neo4j
- Limit Gateway egress to configured LLM endpoints and auth providers
- Block all inter-namespace traffic except the agent namespace

## Identity Provider Integration

### OIDC/SAML SSO

Replace Firebase Auth with your corporate identity provider:

```yaml
gateway:
  auth:
    provider: "oidc"
    oidc:
      issuerUrl: "https://login.yourcompany.com"
      clientId: "agent-ceo"
      audience: "agent-ceo-api"
      scopes: ["openid", "profile", "email"]
      groupsClaim: "groups"
      adminGroup: "agent-ceo-admins"
```

Supported providers: Okta, Azure AD, Google Workspace, Auth0, Keycloak.

## Bring Your Own LLM

Enterprise installations support multiple LLM backends:

| Provider | Configuration | Notes |
|----------|--------------|-------|
| Anthropic (Direct) | `llm.anthropic.apiKey` | Default, recommended |
| Anthropic (Proxy) | `llm.anthropic.baseUrl` | For private endpoints |
| OpenAI | `llm.openai.apiKey` + `baseUrl` | GPT-4o compatible |
| Azure OpenAI | `llm.azureOpenai.endpoint` | Azure-managed deployments |
| Custom | `llm.custom.baseUrl` | Any OpenAI-compatible API |

## Upgrades

Enterprise upgrades follow a controlled release process:

```bash
# Check available versions
helm search repo agent-ceo/agent-ceo-platform --versions

# Review changelog
curl -s https://releases.agent.ceo/v2.5.0/changelog.md

# Upgrade (with automatic rollback on failure)
helm upgrade agent-ceo agent-ceo/agent-ceo-platform \
  --namespace agent-ceo-system \
  --values values-enterprise.yaml \
  --wait --timeout 10m \
  --atomic
```

!!!warning
    Always test upgrades in a staging environment first. Enterprise customers receive release candidates 2 weeks before GA for validation.

## Support

| Channel | Contact | SLA |
|---------|---------|-----|
| Engineering support | [support@agent.ceo](mailto:support@agent.ceo) | 1-hour response |
| Security issues | [security@agent.ceo](mailto:security@agent.ceo) | 30-minute response |
| Account management | [enterprise@agent.ceo](mailto:enterprise@agent.ceo) | Named engineer |
| Emergency hotline | Provided in license agreement | 24/7 |

## Related Documentation

- [Platform Architecture](../platform/architecture.md) — System design and components
- [Kubernetes Deployment](kubernetes.md) — GKE-specific deployment details
- [Self-Hosted Guide](self-hosted.md) — General self-hosting reference
- [Security Overview](../security/overview.md) — Security architecture
- [Networking](networking.md) — Network configuration and ingress
- [Billing & Pricing](../getting-started/billing.md) — Enterprise pricing model
