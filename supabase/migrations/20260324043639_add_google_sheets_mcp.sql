/*
  # Add Google Sheets MCP to server catalog

  1. New Catalog Entry
    - `google-sheets` -- Google Sheets MCP integration via OAuth
    - Uses Smithery-proxied URL (listed in Smithery catalogue)
    - Sort order 16 (between GitHub at 15 and Exa Search at 20)

  2. Details
    - slug: google-sheets
    - name: Google Sheets
    - base_url: https://server.smithery.ai/googlesheets
    - requires_oauth: true
    - requires_api_key: false

  3. Important Notes
    - Uses ON CONFLICT to safely handle re-runs
    - This MCP is listed in the Smithery catalogue (2nd most used)
    - OAuth flow handled by Smithery's standard auth proxy
*/

INSERT INTO mcp_servers (slug, name, description, base_url, requires_api_key, requires_oauth, api_key_name, smithery_slug, default_enabled, sort_order, is_active)
VALUES
  (
    'google-sheets',
    'Google Sheets',
    'Create, read, and edit Google Sheets spreadsheets. Manage cells, rows, and formulas.',
    'https://server.smithery.ai/googlesheets',
    false,
    true,
    null,
    'googlesheets',
    false,
    16,
    true
  )
ON CONFLICT (slug) DO NOTHING;
