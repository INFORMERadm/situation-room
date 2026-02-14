# N3 - Smithery MCP Integration Plan

## Overview

N3 is an advanced ChatGPT-type application with enhanced MCP (Model Context Protocol) integration. A crucial part of this integration is the connection to Smithery, which allows users to connect their own MCPs in addition to the default system MCPs.

---

## Architecture

### Core Components

1. **Default System MCPs** - Pre-configured MCP servers available to all users
2. **User-Connected MCPs via Smithery** - Custom integrations users add themselves
3. **Edge Function Backend** - Supabase Edge Functions to securely proxy Smithery API calls
4. **Connection Management UI** - Frontend interface for users to browse, connect, and manage MCP servers

---

## Implementation Steps

### Phase 1: Backend - Smithery Connection Management

#### 1.1 Database Schema

- **`user_mcp_connections`** table to track which MCP servers each user has connected
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to auth.users)
  - `connection_id` (text) - Smithery connection ID
  - `mcp_url` (text) - The MCP server URL (e.g., `https://server.smithery.ai/@anthropic/github`)
  - `name` (text) - Display name for the connection
  - `status` (text) - `connected`, `auth_required`, `error`
  - `metadata` (jsonb) - Additional metadata
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

- RLS policies scoped so users can only manage their own connections

#### 1.2 Edge Function: `smithery-connect`

- **POST /create** - Create a new Smithery connection for a user
  - Uses `smithery.beta.connect.connections.set()` with user's ID in metadata
  - Returns connection status and `authorizationUrl` if OAuth is required
- **GET /list** - List a user's active connections
  - Filters by `metadata.userId`
- **DELETE /remove** - Remove a user's connection
- **POST /token** - Mint a scoped service token for the frontend
  - Short-lived (1 hour TTL)
  - Scoped to `connections:read` + `mcp:write` for the specific user

#### 1.3 Edge Function: `smithery-mcp-proxy`

- Proxies MCP tool calls through the backend
- Aggregates tools from all of a user's connected MCP servers
- Handles `tools/list` and `tools/call` methods
- Uses the Smithery API key server-side (never exposed to client)

---

### Phase 2: Frontend - Connection Management UI

#### 2.1 MCP Marketplace / Browser

- UI to browse available MCP servers from Smithery
- Search and filter capabilities
- Show server name, description, required auth type

#### 2.2 Connection Management Panel

- List user's current MCP connections with status indicators
- "Connect" button that initiates the OAuth flow when needed
- "Disconnect" button to remove connections
- Status badges: Connected (green), Auth Required (amber), Error (red)

#### 2.3 OAuth Flow Handling

1. User clicks "Connect" on an MCP server
2. Frontend calls the `smithery-connect` edge function
3. If `status === 'auth_required'`, redirect user to `authorizationUrl`
4. User completes OAuth with the upstream provider
5. User is redirected back to N3
6. Frontend retries connection with saved `connectionId`
7. Connection status updates to `connected`

---

### Phase 3: Chat Integration

#### 3.1 Tool Aggregation

- When a user starts a chat session, fetch all their connected MCP tools
- Merge with default system tools
- Pass combined tool set to the AI model

#### 3.2 Tool Execution

- When the AI invokes an MCP tool, route the call through `smithery-mcp-proxy`
- Display tool call status and results in the chat UI (already have `ToolCallIndicator` component)

#### 3.3 Service Token Flow (for direct client-side MCP calls)

- Backend mints a scoped service token for the user
- Frontend uses token to call MCP tools directly via Smithery
- Token auto-refreshes before expiry

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API Key storage | Supabase Edge Function env vars | Never expose to client |
| Client auth | Service tokens (1hr TTL) | Scoped, short-lived, safe for browser |
| Connection tracking | Supabase DB + Smithery metadata | Dual tracking for reliability |
| Tool aggregation | Server-side in edge function | Consistent, secure |
| Namespace | `n3-app` | Single namespace for all N3 connections |

---

## Smithery SDK Reference

### Key Imports

```typescript
import Smithery from '@smithery/api';
import { createConnection, SmitheryAuthorizationError } from '@smithery/api/mcp';
```

### Connection Lifecycle

```typescript
// Create connection
const conn = await smithery.beta.connect.connections.set(connectionId, {
  namespace: 'n3-app',
  mcpUrl: 'https://server.smithery.ai/@anthropic/github',
  name: 'GitHub',
  metadata: { userId: 'user-123' }
});

// List user connections
const connections = await smithery.beta.connect.connections.list('n3-app', {
  metadata: { userId: 'user-123' }
});

// Mint service token
const { token } = await smithery.tokens.create({
  allow: {
    connections: { actions: ['read'], namespaces: ['n3-app'], metadata: { userId } },
    mcp: { actions: ['write'], namespaces: ['n3-app'], metadata: { userId } }
  },
  ttlSeconds: 3600
});

// Direct MCP call
const result = await smithery.beta.connect.mcp.call(connectionId, {
  namespace: 'n3-app',
  method: 'tools/call',
  params: { name: 'tool_name', arguments: { ... } }
});
```

---

## Dependencies to Add

- `@smithery/api` - Smithery SDK (edge function, via npm: specifier)
- `@modelcontextprotocol/sdk` - MCP SDK (edge function, via npm: specifier)

---

## Status

- [ ] Phase 1: Backend setup
- [ ] Phase 2: Frontend UI
- [ ] Phase 3: Chat integration
