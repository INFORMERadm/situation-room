/*
  # Add Excel MCP to server catalog

  1. New Catalog Entry
    - `excel` -- Microsoft Excel MCP integration via OAuth
    - Uses Smithery-proxied URL (listed in Smithery catalogue at excel.run.tools)
    - Sort order 18 (after Google Docs at 17, before Exa Search at 20)

  2. Details
    - slug: excel
    - name: Excel
    - base_url: https://server.smithery.ai/excel
    - requires_oauth: true
    - requires_api_key: false
    - smithery_slug: excel

  3. Important Notes
    - Uses ON CONFLICT to safely handle re-runs
    - OAuth flow handled by Smithery's standard auth proxy
    - Follows identical pattern to the Google Sheets/Docs MCP integrations
*/

INSERT INTO mcp_servers (slug, name, description, base_url, requires_api_key, requires_oauth, api_key_name, smithery_slug, default_enabled, sort_order, is_active)
VALUES
  (
    'excel',
    'Excel',
    'Create, read, and edit Microsoft Excel spreadsheets. Manage workbooks, worksheets, cells, and formulas.',
    'https://server.smithery.ai/excel',
    false,
    true,
    null,
    'excel',
    false,
    18,
    true
  )
ON CONFLICT (slug) DO NOTHING;
