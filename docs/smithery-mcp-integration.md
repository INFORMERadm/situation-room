# Smithery MCP Integration -- Internal Documentation

This document describes how the Smithery MCP (Model Context Protocol) integration works
in the N4 application. It covers the full stack: database schema, edge functions, frontend
hooks, and UI components. Use this as a reference when debugging connection or OAuth issues.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Critical: Server URL Mapping](#critical-server-url-mapping)
3. [Database Schema](#database-schema)
4. [Edge Function: smithery-connect](#edge-function-smithery-connect)
5. [Edge Function: smithery-token](#edge-function-smithery-token)
6. [Frontend Hook: useSmitheryConnections](#frontend-hook-usesmitheryconnections)
7. [Frontend Component: MCPConnectionsPanel](#frontend-component-mcpconnectionspanel)
8. [OAuth Popup Flow (Step-by-Step)](#oauth-popup-flow-step-by-step)
9. [Connection Status States](#connection-status-states)
10. [Smithery Namespace Resolution](#smithery-namespace-resolution)
11. [Connection ID Format](#connection-id-format)
12. [Environment Variables](#environment-variables)
13. [Smithery API Endpoints Used](#smithery-api-endpoints-used)
14. [File Reference](#file-reference)
15. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
Frontend (React)                    Backend (Edge Functions)              External
+-------------------------------+   +------------------------------+   +------------------+
| MCPConnectionsPanel.tsx       |   | smithery-connect/index.ts    |   | Smithery API     |
|   - Catalog browser           |-->|   ?action=create             |-->| api.smithery.ai  |
|   - OAuth popup + polling     |   |   ?action=list               |   |                  |
|   - Connection list           |   |   ?action=remove             |   | MCP Servers      |
|                               |   |   ?action=retry              |   | server.smithery  |
| useSmitheryConnections.ts     |   |   ?action=verify             |   |  .ai/{slug}      |
|   - State management          |   |   ?action=list-tools         |   |                  |
|   - API calls to edge funcs   |   +------------------------------+   | OAuth Providers  |
|                               |   | smithery-token/index.ts      |   | (Google, GitHub) |
| SmitheryOAuthCallback.tsx     |   |   - Mints scoped tokens      |   +------------------+
|   - Legacy callback page      |   +------------------------------+
+-------------------------------+                |
                                    +------------------------------+
                                    | Supabase Database            |
                                    |   - mcp_servers (catalog)    |
                                    |   - user_smithery_connections|
                                    |   - user_secrets             |
                                    +------------------------------+
```

Three layers:
- **Database** -- `mcp_servers` (server catalog), `user_smithery_connections` (per-user connection state), `user_secrets` (API keys for non-OAuth servers)
- **Edge Functions** -- `smithery-connect` (all CRUD + MCP operations), `smithery-token` (service token generation)
- **Frontend** -- `useSmitheryConnections` hook (state + API), `MCPConnectionsPanel` (UI with OAuth popup flow)

---

## Critical: Server URL Mapping

**This was the root cause of the original OAuth failure.** The `mcp_servers.base_url` values
must use the **top-level Smithery registry qualified name**, NOT a scoped namespace path.

### Correct URLs

| Server           | slug              | Correct base_url                              |
|------------------|-------------------|-----------------------------------------------|
| Gmail            | `google-gmail`    | `https://server.smithery.ai/gmail`            |
| Google Calendar  | `google-calendar` | `https://server.smithery.ai/googlecalendar`   |
| Google Drive     | `google-drive`    | `https://server.smithery.ai/googledrive`      |
| Notion           | `notion`          | `https://server.smithery.ai/notion`           |
| Slack            | `slack`           | `https://server.smithery.ai/slack`            |
| GitHub           | `github`          | `https://server.smithery.ai/github`           |
| Exa Search       | `exa-search`      | `https://server.smithery.ai/exa`              |
| CustomGPT        | `customgpt-mcp`   | `https://mcp.customgpt.ai/projects/79211/mcp/`|

### Previously Broken URLs (DO NOT USE)

These old URLs returned 404 from Smithery, which caused the API to return
`status.state: "error"` with message `"Initialization failed with status 404"`
instead of `status.state: "auth_required"` with an `authorizationUrl`:

- `https://server.smithery.ai/@anthropic-ai/gmail` -- **404**
- `https://server.smithery.ai/@anthropic-ai/google-calendar` -- **404**
- `https://server.smithery.ai/@anthropic-ai/google-drive` -- **404**
- `https://server.smithery.ai/@anthropic-ai/notion` -- **404**
- `https://server.smithery.ai/@anthropic-ai/slack` -- **404**
- `https://server.smithery.ai/@anthropic-ai/github` -- **404**

### How to Find Correct URLs

Search the Smithery registry API:
```
GET https://registry.smithery.ai/servers?q={search_term}
```
The `qualifiedName` field in results is what goes in the URL path.

Verify with:
```
curl -s -o /dev/null -w "%{http_code}" "https://server.smithery.ai/{qualifiedName}"
```
- **401** = valid server (requires auth)
- **404** = wrong URL

Fix migration: `supabase/migrations/20260227160256_fix_mcp_server_urls.sql`

---

## Database Schema

### mcp_servers

Server catalog. Seeded with curated integrations.

| Column            | Type      | Description                                     |
|-------------------|-----------|-------------------------------------------------|
| `id`              | uuid PK   | Auto-generated                                  |
| `slug`            | text UQ    | Unique identifier (e.g., `google-gmail`)        |
| `name`            | text       | Display name (e.g., `Gmail`)                    |
| `description`     | text       | User-facing description                         |
| `base_url`        | text       | MCP server endpoint URL (see mapping above)     |
| `requires_api_key`| boolean    | Whether server needs a user-provided API key    |
| `requires_oauth`  | boolean    | Whether server uses OAuth flow                  |
| `api_key_name`    | text       | ENV var name for API key (e.g., `EXA_API_KEY`)  |
| `smithery_slug`   | text       | Smithery registry slug                          |
| `default_enabled` | boolean    | Auto-connect for new users                      |
| `sort_order`      | integer    | Display order in catalog                        |
| `is_active`       | boolean    | Show in catalog                                 |

Relevant migrations:
- `20260221195052_create_mcp_servers_and_user_secrets.sql` -- table creation
- `20260226073950_add_requires_oauth_and_seed_curated_servers.sql` -- OAuth column + seed data
- `20260227160256_fix_mcp_server_urls.sql` -- URL corrections

### user_smithery_connections

Per-user connection state. Tracks what each user has connected via Smithery.

| Column                    | Type        | Description                                      |
|---------------------------|-------------|--------------------------------------------------|
| `id`                      | uuid PK     | Auto-generated                                   |
| `user_id`                 | uuid FK     | References `auth.users(id)`, cascade delete      |
| `smithery_namespace`      | text         | Smithery namespace (typically `INFORMERadm` or `n4-app`) |
| `smithery_connection_id`  | text         | Unique ID passed to Smithery API                 |
| `mcp_url`                 | text         | MCP server URL                                   |
| `display_name`            | text         | Human-readable name                              |
| `status`                  | text         | `connected`, `auth_required`, or `error`         |
| `created_at`              | timestamptz  | Creation timestamp                               |
| `updated_at`              | timestamptz  | Last status update                               |

Unique constraint: `(user_id, smithery_connection_id)`

RLS: Users can only CRUD their own rows (`auth.uid() = user_id`).

Migration: `20260221132749_create_user_smithery_connections.sql`

### user_secrets

Stores encrypted API keys for non-OAuth servers (e.g., Exa Search).

| Column            | Type        | Description                          |
|-------------------|-------------|--------------------------------------|
| `id`              | uuid PK     | Auto-generated                       |
| `user_id`         | uuid FK     | References `auth.users(id)`          |
| `key_name`        | text         | Secret identifier (e.g., `EXA_API_KEY`) |
| `encrypted_value` | text         | The secret value                     |

Unique constraint: `(user_id, key_name)`

Migration: `20260221195052_create_mcp_servers_and_user_secrets.sql`

---

## Edge Function: smithery-connect

**File:** `supabase/functions/smithery-connect/index.ts`

Single edge function that handles all MCP connection operations via an `?action=` query parameter.

### Routing

```
POST /smithery-connect?action=create     -> handleCreate()
POST /smithery-connect?action=list       -> handleList()
POST /smithery-connect?action=remove     -> handleRemove()
POST /smithery-connect?action=retry      -> handleRetry()     <-- used by OAuth polling
POST /smithery-connect?action=verify     -> handleVerify()
POST /smithery-connect?action=list-tools -> handleListTools()
```

All requests require `Authorization: Bearer {supabase_jwt}` header.

### Shared Utilities

- **`getSmitheryClient()`** -- Creates `Smithery` SDK client from `SMITHERY_API_KEY` env var
- **`parseConnectionStatus(conn)`** -- Extracts `status`, `authorizationUrl`, `errorMessage` from Smithery API response. The Smithery API returns status as a nested object `{ state: "...", authorizationUrl: "...", message: "..." }`
- **`authenticateUser(req)`** -- Validates JWT via Supabase service role, returns `{ user, supabase }`
- **`getNamespace(smithery)`** -- Resolves Smithery namespace (see [Namespace Resolution](#smithery-namespace-resolution))

### Action: create

Creates a new MCP connection.

**Request body:** `{ mcpUrl: string, displayName: string }`

**Flow:**
1. Authenticate user
2. Check if connection already exists for this `mcpUrl` (reuse existing `connectionId`)
3. Generate `connectionId` as `{userId}-{timestamp}` if new
4. `PUT https://api.smithery.ai/connect/{namespace}/{connectionId}` with `{ mcpUrl, name, metadata: { userId } }`
5. Handle 409 Conflict: delete old connection, generate new ID, retry PUT
6. Parse response status:
   - `error` -- Save error status to DB, return error with message
   - `connected` -- Verify by calling `tools/list` via MCP RPC. If verification fails, re-check status (may have become `auth_required`)
   - `auth_required` -- Return `authorizationUrl` for frontend popup
7. Upsert to `user_smithery_connections`
8. Return `{ connectionId, status, authorizationUrl, serverInfo }`

### Action: list

Lists all user connections, syncing status with Smithery.

**Request body:** none

**Flow:**
1. Authenticate user
2. `GET https://api.smithery.ai/connect/{namespace}?metadata.userId={userId}`
3. For each Smithery connection: update local DB status
4. Return all connections from `user_smithery_connections` table

### Action: remove

Deletes a connection.

**Request body:** `{ connectionId: string }`

**Flow:**
1. `DELETE https://api.smithery.ai/connect/{namespace}/{connectionId}`
2. Delete from `user_smithery_connections` (even if Smithery API fails)

### Action: retry

Polls current connection status. **This is the action called during OAuth polling.**

**Request body:** `{ connectionId: string }`

**Flow:**
1. `GET https://api.smithery.ai/connect/{namespace}/{connectionId}`
2. Parse status from response
3. Update status in DB
4. Return `{ connectionId, status, authorizationUrl }`

### Action: verify

Same as retry. Explicit verification endpoint.

### Action: list-tools

Aggregates tools from all connected servers.

**Request body:** none

**Flow:**
1. Fetch all `connected` connections from DB
2. For each: `POST .../mcp` with JSON-RPC `{ method: "tools/list" }`
3. Handle both JSON and `text/event-stream` (SSE) responses
4. Return `{ tools: [...], servers: [...] }`

**Tool structure:**
```json
{
  "name": "search_repositories",
  "description": "Search GitHub repos",
  "inputSchema": { "type": "object", "properties": {...} },
  "serverName": "GitHub",
  "connectionId": "user-id-1234567890"
}
```

---

## Edge Function: smithery-token

**File:** `supabase/functions/smithery-token/index.ts`

Mints scoped Smithery service tokens for frontend MCP calls.

**Flow:**
1. Authenticate user via JWT
2. Query all `connected` connections to get unique namespaces
3. `POST https://api.smithery.ai/tokens` with scoped permissions:
   - `connections: { actions: ["read"], namespaces, metadata: { userId } }`
   - `mcp: { actions: ["write"], namespaces, metadata: { userId } }`
   - `ttlSeconds: 3600` (1 hour)
4. Return `{ token, expiresAt }`

---

## Frontend Hook: useSmitheryConnections

**File:** `src/hooks/useSmitheryConnections.ts`

React hook managing connection state and API calls.

### State

- `connections: SmitheryConnection[]` -- All user connections
- `catalog: CatalogServer[]` -- Available servers from `mcp_servers`
- `connectionsLoading: boolean`
- `catalogLoading: boolean`

### Key Functions

| Function                  | Calls                                | Returns                                              |
|---------------------------|--------------------------------------|------------------------------------------------------|
| `fetchConnections()`      | `?action=list` (fallback: direct DB) | Updates `connections` state                          |
| `fetchCatalog()`          | Direct query on `mcp_servers`        | Updates `catalog` state                              |
| `connectServer(url, name)`| `?action=create`                     | `{ success, status, authorizationUrl, connectionId }` |
| `removeConnection(id)`    | `?action=remove` + direct DB delete  | Refreshes connections                                |
| `retryConnection(connId)` | `?action=retry`                      | `{ success, status, authorizationUrl }`              |
| `addConnection(conn)`     | Direct upsert to DB                  | Refreshes connections                                |
| `updateConnectionStatus()`| Direct DB update                     | --                                                   |

### sessionStorage

- Key: `smithery_pending_connection`
- Stores `connectionId` during OAuth flow
- Used by `SmitheryOAuthCallback` page and `connectServer()` to track which connection is being authorized
- Cleared on successful connection

---

## Frontend Component: MCPConnectionsPanel

**File:** `src/components/MCPConnectionsPanel.tsx`

### Three Tabs

1. **Integrations** (`CatalogList`) -- Browse and connect servers from catalog
2. **Connected** (`ConnectionsList`) -- View/manage active connections
3. **Custom** -- Form for custom MCP server URLs

### OAuth Popup Flow Implementation

The `startOAuthFlow` function (defined inside the main `MCPConnectionsPanel` component):

```
startOAuthFlow(authorizationUrl, connectionId)
  |
  +-> Opens popup window (600x700px, centered on screen)
  |   URL: authorizationUrl from Smithery API
  |   Name: 'smithery_oauth'
  |
  +-> Sets pollingConnectionId state (shows "Waiting for auth..." in UI)
  |
  +-> Starts setInterval (every 2 seconds, max 120 iterations = 4 min timeout)
        |
        +-> Check if popup was closed by user
        |     Yes -> Final status check via onRetry(connectionId)
        |            Connected? -> Success, clear polling
        |            Not connected? -> Show "window was closed" error
        |
        +-> Check if max attempts reached (120 = 4 minutes)
        |     Yes -> Close popup, show "timed out" error
        |
        +-> Every 3rd iteration (every 6 seconds):
              Call onRetry(connectionId) to check status
              Connected? -> Close popup, clear polling, done
```

### Button States in CatalogList

| Connection State     | Button Display          |
|----------------------|------------------------|
| Not connected        | Orange "Connect" button |
| Connecting (API call)| Gray "Connecting..."    |
| Waiting for OAuth    | Blue "Waiting for auth..."|
| auth_required        | Amber "Authorize"       |
| connected            | Green "Connected" badge |

---

## OAuth Popup Flow (Step-by-Step)

Complete sequence when user clicks "Connect" on an OAuth server like Gmail:

```
1. User clicks "Connect" on Gmail in CatalogList
                |
2. handleCatalogConnect() called
   - Checks for existing auth_required connection
   - If exists: calls onRetry() to get fresh authorizationUrl
   - If not: calls onConnectServer(url, name)
                |
3. connectServer() in useSmitheryConnections hook
   - POST /smithery-connect?action=create
   - Body: { mcpUrl: "https://server.smithery.ai/gmail", displayName: "Gmail" }
                |
4. Edge function handleCreate()
   - PUT https://api.smithery.ai/connect/{namespace}/{connectionId}
   - Smithery connects to server.smithery.ai/gmail
   - Gmail requires OAuth -> returns { status: { state: "auth_required", authorizationUrl: "https://api.smithery.ai/connect/{ns}/{connId}/auth" } }
   - Saves to DB with status "auth_required"
   - Returns { connectionId, status: "auth_required", authorizationUrl }
                |
5. Frontend receives response
   - connectServer() stores connectionId in sessionStorage
   - Returns { success: true, status: "auth_required", authorizationUrl, connectionId }
                |
6. handleCatalogConnect() calls startOAuthFlow(authorizationUrl, connectionId)
   - Opens popup window to: https://api.smithery.ai/connect/{ns}/{connId}/auth
   - Starts polling interval
                |
7. Popup loads Smithery auth endpoint
   - 302 redirect to: https://auth.smithery.ai/gmail/authorize?...
   - Which redirects to Google OAuth consent screen
   - redirect_uri = https://api.smithery.ai/connect/oauth/callback (Smithery handles this)
                |
8. User completes Google OAuth in popup
   - Google redirects to Smithery callback
   - Smithery stores credentials, updates connection status to "connected"
   - Popup shows Smithery's post-auth page (or may close automatically)
                |
9. Polling detects status change
   - Every 6 seconds: POST /smithery-connect?action=retry { connectionId }
   - Edge function GETs connection from Smithery API
   - Smithery returns { status: { state: "connected" } }
   - Edge function updates DB status to "connected"
   - Returns { status: "connected" }
                |
10. Frontend polling callback sees status === "connected"
    - Clears interval
    - Closes popup if still open
    - Sets pollingConnectionId to null
    - UI updates: "Waiting for auth..." -> "Connected"
                |
11. Done. Connection is live. Tools are now available.
```

### Alternative: Popup Closed by User

If the user closes the popup before completing OAuth:

```
Polling detects popup.closed === true
  -> Does one final onRetry() check
  -> If not "connected": shows error "Authorization window was closed"
  -> User can click "Authorize" again to restart
```

### Alternative: Timeout

If OAuth takes longer than 4 minutes:

```
attempts >= 120
  -> Clears interval
  -> Closes popup
  -> Shows "Authorization timed out" error
```

---

## Connection Status States

| State            | Meaning                                        | Trigger                                         |
|------------------|------------------------------------------------|-------------------------------------------------|
| `connected`      | Fully operational, tools available              | Smithery API confirms connected                 |
| `auth_required`  | OAuth not yet completed                        | Smithery returns authorizationUrl               |
| `error`          | Connection failed                              | Server URL 404, init failure, or other error    |

Statuses are synced between Smithery API and local DB on every `retry`, `list`, and `verify` call.

---

## Smithery Namespace Resolution

The Smithery namespace groups all connections for this application.

**Logic in `getNamespace()`:**
1. Check if `resolvedNamespace` is already cached (module-level variable) -- return if so
2. Call `smithery.namespaces.list()` to get existing namespaces
3. If any exist: use the first one, cache it
4. If none: create `"n4-app"` via `smithery.namespaces.set()`
5. Handle 409 (already exists) gracefully
6. Cache in `resolvedNamespace` for subsequent calls in same function invocation

**Current namespace in production:** `INFORMERadm` (auto-created by Smithery account, used by first namespace lookup)

---

## Connection ID Format

Generated as: `{user.id}-{Date.now()}`

Example: `780e1569-3f93-4fcd-80b0-225bb7f0e8ca-1772207998747`

Used as:
- Smithery API path parameter: `/connect/{namespace}/{connectionId}`
- Stored in `user_smithery_connections.smithery_connection_id`
- Unique per user per timestamp (prevents collisions)

### 409 Conflict Handling

If a PUT to create a connection returns 409:
1. DELETE the old connection on Smithery
2. Generate a new `connectionId` with fresh timestamp
3. Retry the PUT with the new ID

---

## Environment Variables

### Edge Functions (auto-populated in Supabase)

| Variable                   | Used By             | Description                               |
|----------------------------|---------------------|-------------------------------------------|
| `SMITHERY_API_KEY`         | Both edge functions | Smithery API authentication               |
| `SUPABASE_URL`             | Both edge functions | Supabase instance URL                     |
| `SUPABASE_SERVICE_ROLE_KEY`| Both edge functions | Service role for user auth validation     |

### Frontend (.env)

| Variable                | Description                      |
|-------------------------|----------------------------------|
| `VITE_SUPABASE_URL`    | Supabase URL (for API base path) |
| `VITE_SUPABASE_ANON_KEY`| Supabase anon key (auth)        |

---

## Smithery API Endpoints Used

| Method | Endpoint                                             | Used In       | Purpose                          |
|--------|------------------------------------------------------|---------------|----------------------------------|
| GET    | `api.smithery.ai/namespaces/list`                    | Namespace res.| List existing namespaces         |
| PUT    | `api.smithery.ai/namespaces/set/{name}`              | Namespace res.| Create namespace                 |
| PUT    | `api.smithery.ai/connect/{ns}/{connId}`              | create        | Create/update connection         |
| GET    | `api.smithery.ai/connect/{ns}/{connId}`              | retry/verify  | Get connection status            |
| GET    | `api.smithery.ai/connect/{ns}?metadata.userId={id}`  | list          | List user's connections          |
| DELETE | `api.smithery.ai/connect/{ns}/{connId}`              | remove        | Delete connection                |
| POST   | `api.smithery.ai/connect/{ns}/{connId}/mcp`          | list-tools    | JSON-RPC MCP calls (tools/list)  |
| POST   | `api.smithery.ai/tokens`                             | smithery-token| Mint scoped service tokens       |

### Smithery Auth Flow Endpoints (handled by Smithery, not our code)

| Endpoint                                               | Purpose                                     |
|--------------------------------------------------------|---------------------------------------------|
| `api.smithery.ai/connect/{ns}/{connId}/auth`           | Starts OAuth, redirects to provider         |
| `auth.smithery.ai/{server}/authorize?...`              | Provider-specific OAuth consent             |
| `api.smithery.ai/connect/oauth/callback`               | Smithery's OAuth callback (redirect_uri)    |

---

## File Reference

| File                                                  | Responsibility                                     |
|-------------------------------------------------------|----------------------------------------------------|
| `supabase/functions/smithery-connect/index.ts`        | All connection CRUD + MCP tool listing             |
| `supabase/functions/smithery-token/index.ts`          | Service token minting for frontend MCP calls       |
| `src/hooks/useSmitheryConnections.ts`                 | React hook: state management + API calls           |
| `src/components/MCPConnectionsPanel.tsx`              | UI: catalog, connections list, OAuth popup flow    |
| `src/pages/SmitheryOAuthCallback.tsx`                 | Legacy OAuth callback page (still exists as fallback)|
| `src/types/index.ts`                                  | TypeScript types                                   |
| `supabase/migrations/20260221132749_...`              | user_smithery_connections table                    |
| `supabase/migrations/20260221195052_...`              | mcp_servers + user_secrets tables                  |
| `supabase/migrations/20260226073950_...`              | requires_oauth column + seed data                  |
| `supabase/migrations/20260227160256_...`              | Server URL fixes (critical bug fix)                |

---

## Troubleshooting

### OAuth servers fail with "error" instead of "auth_required"

**Root cause:** Wrong MCP server URL returning 404 from Smithery.

**Diagnosis:**
```bash
# Check if URL is valid (should return 401, not 404)
curl -s -o /dev/null -w "%{http_code}" "https://server.smithery.ai/{slug}"
```

**Fix:** Update `mcp_servers.base_url` to use correct Smithery registry qualified name.
See [Critical: Server URL Mapping](#critical-server-url-mapping).

### OAuth popup opens but connection never becomes "connected"

**Possible causes:**
1. User didn't complete OAuth in the popup (check if popup was closed)
2. Smithery callback failed (check Smithery dashboard)
3. Polling stopped due to timeout (4 minute limit)

**Diagnosis:**
```bash
# Check connection status directly
curl -s -X GET "https://api.smithery.ai/connect/{namespace}/{connectionId}" \
  -H "Authorization: Bearer {SMITHERY_API_KEY}"
```

### 409 Conflict when creating connections

This is handled automatically. The edge function deletes the old connection and retries
with a new timestamp-based ID. If it persists, check for stale records:

```sql
SELECT * FROM user_smithery_connections
WHERE user_id = '{user_id}' AND mcp_url = '{mcp_url}'
ORDER BY created_at DESC;
```

### Tools not showing up for connected server

1. Verify connection is actually `connected` (not just in DB but on Smithery side too)
2. Check `list-tools` action response -- may have SSE parsing issues
3. Some servers take time to initialize after OAuth

```bash
# Test tools/list directly
curl -s -X POST "https://api.smithery.ai/connect/{namespace}/{connectionId}/mcp" \
  -H "Authorization: Bearer {SMITHERY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"test","method":"tools/list","params":{}}'
```

### Namespace mismatch

If connections were created under a different namespace than expected,
the `list` action may not find them. Check:

```sql
SELECT DISTINCT smithery_namespace FROM user_smithery_connections;
```

The first namespace found in the Smithery account is used. Currently: `INFORMERadm`.

### Adding a new OAuth server to the catalog

1. Find the correct qualified name: `GET https://registry.smithery.ai/servers?q={name}`
2. Verify URL: `curl -s -o /dev/null -w "%{http_code}" "https://server.smithery.ai/{qualifiedName}"` (expect 401)
3. Insert into `mcp_servers`:
   ```sql
   INSERT INTO mcp_servers (slug, name, description, base_url, requires_oauth, sort_order, is_active)
   VALUES ('my-server', 'My Server', 'Description', 'https://server.smithery.ai/{qualifiedName}', true, 80, true);
   ```

### Smithery API key issues

The key is stored as `SMITHERY_API_KEY` in Supabase edge function secrets.
Check with `mcp__supabase__list_edge_function_secrets`. The key format is a UUID:
`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.
