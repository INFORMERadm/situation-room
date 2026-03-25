/*
  # Add Google Docs MCP to server catalog

  1. New Catalog Entry
    - `google-docs` -- Google Docs MCP integration via OAuth
    - Uses Smithery-proxied URL (listed in Smithery catalogue at googledocs.run.tools)
    - Sort order 17 (after Google Sheets at 16, before Exa Search at 20)

  2. Details
    - slug: google-docs
    - name: Google Docs
    - base_url: https://server.smithery.ai/googledocs
    - requires_oauth: true
    - requires_api_key: false
    - smithery_slug: googledocs

  3. Important Notes
    - Uses ON CONFLICT to safely handle re-runs
    - OAuth flow handled by Smithery's standard auth proxy
    - Follows identical pattern to the Google Sheets MCP integration
*/

INSERT INTO mcp_servers (slug, name, description, base_url, requires_api_key, requires_oauth, api_key_name, smithery_slug, default_enabled, sort_order, is_active)
VALUES
  (
    'google-docs',
    'Google Docs',
    'Create, read, and edit Google Docs documents. Search, format text, and manage document content.',
    'https://server.smithery.ai/googledocs',
    false,
    true,
    null,
    'googledocs',
    false,
    17,
    true
  )
ON CONFLICT (slug) DO NOTHING;
