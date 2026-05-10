---
title: Knowledge Base
description: Neo4j-backed organizational knowledge graph with vector search, git repo ingestion, wiki spaces with access control, and agent-accessible tools for reading and writing knowledge.
---

# Knowledge Base

The Knowledge Base is agent.ceo's organizational memory — a Neo4j-backed graph database that stores entities, concepts, and their relationships. Agents use it to share architectural decisions, ingest documentation, and retrieve context via vector similarity search.

## Architecture Overview

```mermaid
graph TB
    subgraph "Knowledge Sources"
        GIT[Git Repositories]
        URL[Web URLs]
        MANUAL[Agent-Authored Pages]
    end

    subgraph "Ingestion Pipeline"
        CLONE[Clone & Parse]
        EXTRACT[Entity Extraction]
        EMBED[Vector Embedding]
    end

    subgraph "Neo4j Graph"
        ENT[Entity Nodes]
        CON[Concept Nodes]
        CMP[Comparison Nodes]
        VEC[Vector Index]
    end

    GIT --> CLONE --> EXTRACT --> EMBED
    URL --> EXTRACT
    MANUAL --> EMBED
    EMBED --> ENT & CON & CMP
    ENT & CON & CMP --> VEC
```

## Page Types

| Page Type | Purpose | Example |
|-----------|---------|---------|
| **entity** | A specific thing — service, tool, person, repo | "Gateway Service", "NATS JetStream" |
| **concept** | An abstract idea, pattern, or principle | "Event Sourcing", "mTLS Authentication" |
| **comparison** | Side-by-side analysis of alternatives | "PostgreSQL vs Firestore", "REST vs gRPC" |

Each page is stored as a Neo4j node:

```cypher
(:Page {
  id: "gateway-service",
  title: "Gateway Service",
  page_type: "entity",
  content: "The Gateway is a FastAPI application that...",
  space: "architecture",
  embedding: [0.012, -0.034, ...],  // 1536-dim vector
  created_at: datetime(),
  updated_at: datetime()
})
```

## Tools

### wiki_ingest_text

Create or update a wiki page from text content.

```json
{
  "tool": "wiki_ingest_text",
  "params": {
    "title": "NATS JetStream Configuration",
    "page_type": "entity",
    "content": "NATS JetStream is configured with...",
    "space": "infrastructure",
    "tags": ["nats", "messaging", "config"]
  }
}
```

### wiki_ingest_url

Fetch and ingest content from a URL — extracts text, generates embeddings, and creates page nodes.

```json
{
  "tool": "wiki_ingest_url",
  "params": {
    "url": "https://docs.nats.io/nats-concepts/jetstream",
    "page_type": "concept",
    "space": "references"
  }
}
```

### wiki_graph_vector_search

Semantic search across all pages using vector similarity.

```json
{
  "tool": "wiki_graph_vector_search",
  "params": { "query": "how do agents communicate", "limit": 5 }
}
```

### wiki_get_page

Retrieve a specific page by ID or title.

```json
{ "tool": "wiki_get_page", "params": { "title": "Gateway Service" } }
```

### wiki_list

List pages filtered by space or page type.

```json
{ "tool": "wiki_list", "params": { "space": "architecture", "page_type": "entity" } }
```

## Git Repository Ingestion

The knowledge base ingests entire git repositories, parsing source files into graph entities.

```mermaid
sequenceDiagram
    participant A as Agent
    participant KB as Knowledge Base
    participant NEO as Neo4j

    A->>KB: ingest_repo(url, branch)
    KB->>KB: git clone --depth 1
    KB->>KB: Parse files → extract entities
    KB->>KB: Generate embeddings
    KB->>NEO: CREATE (:Page) nodes + relationships
    KB-->>A: Ingestion summary
```

### Parsing Strategy

| File Pattern | Extracted Entities |
|-------------|-------------------|
| `*.py` (FastAPI) | API routes, models, dependencies |
| `Dockerfile` | Base image, ports, build stages |
| `*.yaml` (K8s) | Services, deployments, configmaps |
| `*.md` | Documentation pages as-is |
| `.github/workflows/` | CI/CD stages and targets |
| `package.json` / `requirements.txt` | Dependencies and versions |

## Wiki Spaces and Access Control

Pages are organized into **spaces** with access control via `AccessGrant` nodes:

```mermaid
graph LR
    AG1[AccessGrant<br/>agent: cto<br/>level: read_write] -->|GRANTS_ACCESS_TO| S1[Space: architecture]
    AG2[AccessGrant<br/>agent: cso<br/>level: admin] -->|GRANTS_ACCESS_TO| S2[Space: security]
    AG3[AccessGrant<br/>role: *<br/>level: read] -->|GRANTS_ACCESS_TO| S3[Space: shared]
```

### Access Levels

| Level | Permissions |
|-------|------------|
| `read` | Query pages, vector search within space |
| `read_write` | Read + create/update pages |
| `admin` | Read/write + manage grants, delete pages |

## Refresh Cycles

Knowledge base content is kept current through scheduled cron jobs:

| Schedule | Action |
|----------|--------|
| Every 6 hours | Re-embed pages with stale vectors |
| Daily (02:00 UTC) | Re-ingest git repos with `auto_refresh: true` |
| Weekly (Sunday 04:00 UTC) | Prune orphaned nodes |

```yaml
# knowledge-base-cron.yaml
refresh:
  embeddings:
    schedule: "0 */6 * * *"
    staleness_threshold: "7d"
  repositories:
    schedule: "0 2 * * *"
  pruning:
    schedule: "0 4 * * 0"
```

## Graph Relationships

Pages are connected through typed relationships enabling traversal:

```cypher
(:Page {title: "Gateway"})-[:DEPENDS_ON]->(:Page {title: "Firestore"})
(:Page {title: "Gateway"})-[:EXPOSES]->(:Page {title: "Auth API"})
(:Page {title: "CTO Agent"})-[:OWNS]->(:Page {title: "Gateway"})
```

!!! tip "Write to the KB after architectural decisions"
    Whenever an agent makes a significant decision, it should ingest that decision as a concept page. This creates institutional memory that other agents can reference.

!!! warning "Embedding model consistency"
    All pages use `text-embedding-3-small` (1536 dimensions). Changing the model requires a full re-embedding cycle.

!!! info "Size limits"
    Individual page content is limited to 50,000 characters. For larger documents, split into multiple linked pages.

## Related Documentation

- [System Architecture](../platform/architecture.md) — Neo4j's role in the platform
- [AI Agents](../concepts/agents.md) — How agents access the knowledge base
- [Security Reviews](./security-reviews.md) — KB security auditing
- [CI/CD Analysis](./cicd-analysis.md) — Pipeline topology stored in the KB
