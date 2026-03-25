/*
  # Add Agentmail MCP to server catalog

  1. New Catalog Entry
    - `agentmail` -- Agentmail email automation MCP via Smithery
    - Listed at agentmail.run.tools
    - Sort order 24

  2. Details
    - slug: agentmail
    - name: Agentmail
    - base_url: https://server.smithery.ai/agentmail
    - requires_oauth: false
    - requires_api_key: true
    - api_key_name: AGENTMAIL_API_KEY
    - smithery_slug: agentmail

  3. Important Notes
    - Uses ON CONFLICT to safely handle re-runs
    - Requires an API key from Agentmail
    - Provides AI with ability to send, receive, and manage emails programmatically
*/

INSERT INTO mcp_servers (slug, name, description, base_url, requires_api_key, requires_oauth, api_key_name, smithery_slug, default_enabled, sort_order, is_active)
VALUES
  (
    'agentmail',
    'Agentmail',
    'Send, receive, and manage emails programmatically. Create mailboxes, handle inbound messages, and automate email workflows.',
    'https://server.smithery.ai/agentmail',
    true,
    false,
    'AGENTMAIL_API_KEY',
    'agentmail',
    false,
    24,
    true
  )
ON CONFLICT (slug) DO NOTHING;
