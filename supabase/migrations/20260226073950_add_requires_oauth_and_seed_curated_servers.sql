/*
  # Add requires_oauth column and seed curated MCP server catalog

  ## Summary
  Adds an `requires_oauth` boolean column to the `mcp_servers` table to distinguish
  OAuth-based integrations (Gmail, Calendar, Notion, etc.) from API-key-based ones.
  Seeds the catalog with curated official remote MCP servers that users can connect.

  ## Modified Tables
  - `mcp_servers`
    - Added `requires_oauth` (boolean, default false) to indicate OAuth flow needed
    - Added `smithery_slug` (text) for the Smithery server URL slug

  ## Seed Data
  Inserts curated MCP servers:
  1. Google Gmail - Email management via OAuth
  2. Google Calendar - Calendar management via OAuth
  3. Google Drive - File access via OAuth
  4. Notion - Workspace management via OAuth
  5. Slack - Messaging via OAuth
  6. GitHub - Repository management via OAuth
  7. Exa Search - Web search via API key

  ## Important Notes
  - Uses IF NOT EXISTS / ON CONFLICT to safely handle re-runs
  - Existing customgpt-mcp entry is not affected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mcp_servers' AND column_name = 'requires_oauth'
  ) THEN
    ALTER TABLE mcp_servers ADD COLUMN requires_oauth boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mcp_servers' AND column_name = 'smithery_slug'
  ) THEN
    ALTER TABLE mcp_servers ADD COLUMN smithery_slug text;
  END IF;
END $$;

INSERT INTO mcp_servers (slug, name, description, base_url, requires_api_key, requires_oauth, api_key_name, smithery_slug, default_enabled, sort_order, is_active)
VALUES
  (
    'google-gmail',
    'Gmail',
    'Read, send, and manage your email. Search messages, draft replies, and organize your inbox.',
    'https://server.smithery.ai/@anthropic-ai/gmail',
    false,
    true,
    null,
    '@anthropic-ai/gmail',
    false,
    10,
    true
  ),
  (
    'google-calendar',
    'Google Calendar',
    'View and manage your calendar events. Check schedules, create meetings, and find available time slots.',
    'https://server.smithery.ai/@anthropic-ai/google-calendar',
    false,
    true,
    null,
    '@anthropic-ai/google-calendar',
    false,
    11,
    true
  ),
  (
    'google-drive',
    'Google Drive',
    'Access and manage your files in Google Drive. Search documents, read content, and organize files.',
    'https://server.smithery.ai/@anthropic-ai/google-drive',
    false,
    true,
    null,
    '@anthropic-ai/google-drive',
    false,
    12,
    true
  ),
  (
    'notion',
    'Notion',
    'Search and manage your Notion workspace. Access pages, databases, and create or update content.',
    'https://server.smithery.ai/@anthropic-ai/notion',
    false,
    true,
    null,
    '@anthropic-ai/notion',
    false,
    13,
    true
  ),
  (
    'slack',
    'Slack',
    'Send and read messages in Slack. Manage channels, search conversations, and collaborate with your team.',
    'https://server.smithery.ai/@anthropic-ai/slack',
    false,
    true,
    null,
    '@anthropic-ai/slack',
    false,
    14,
    true
  ),
  (
    'github',
    'GitHub',
    'Manage repositories, issues, and pull requests. Search code, review changes, and collaborate on projects.',
    'https://server.smithery.ai/@anthropic-ai/github',
    false,
    true,
    null,
    '@anthropic-ai/github',
    false,
    15,
    true
  ),
  (
    'exa-search',
    'Exa Search',
    'Powerful neural web search engine. Find relevant web pages, articles, and information across the internet.',
    'https://server.smithery.ai/exa',
    true,
    false,
    'EXA_API_KEY',
    'exa',
    false,
    20,
    true
  )
ON CONFLICT (slug) DO NOTHING;
