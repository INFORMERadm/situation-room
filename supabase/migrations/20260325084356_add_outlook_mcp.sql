/*
  # Add Outlook MCP to server catalog

  1. New Catalog Entry
    - `outlook` -- Microsoft Outlook MCP integration via OAuth
    - Uses Smithery-proxied URL (listed at outlook.run.tools)
    - Sort order 20 (after Context7 at 19)

  2. Details
    - slug: outlook
    - name: Outlook
    - base_url: https://server.smithery.ai/outlook
    - requires_oauth: true
    - requires_api_key: false
    - smithery_slug: outlook

  3. Important Notes
    - Uses ON CONFLICT to safely handle re-runs
    - OAuth flow handled by Smithery's standard auth proxy
    - Follows identical pattern to the Google Docs/Excel MCP integrations
    - Provides access to Outlook email, calendar, and contacts
*/

INSERT INTO mcp_servers (slug, name, description, base_url, requires_api_key, requires_oauth, api_key_name, smithery_slug, default_enabled, sort_order, is_active)
VALUES
  (
    'outlook',
    'Outlook',
    'Access Microsoft Outlook email, calendar, and contacts. Read, send, and manage emails, schedule meetings, and manage contacts.',
    'https://server.smithery.ai/outlook',
    false,
    true,
    null,
    'outlook',
    false,
    20,
    true
  )
ON CONFLICT (slug) DO NOTHING;
