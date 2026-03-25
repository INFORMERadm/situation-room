/*
  # Add Context7 MCP to server catalog

  1. New Catalog Entry
    - `context7` -- Context7 MCP by Upstash for up-to-date library documentation
    - Uses Smithery-proxied URL (listed at context7-mcp--upstash.run.tools)
    - Sort order 19 (after Excel at 18, before Exa Search at 20)

  2. Details
    - slug: context7
    - name: Context7
    - base_url: https://server.smithery.ai/@upstash/context7-mcp
    - requires_oauth: false
    - requires_api_key: false
    - smithery_slug: @upstash/context7-mcp

  3. Important Notes
    - Uses ON CONFLICT to safely handle re-runs
    - No auth required -- Context7 is a free public MCP
    - Provides up-to-date documentation context for libraries and frameworks
*/

INSERT INTO mcp_servers (slug, name, description, base_url, requires_api_key, requires_oauth, api_key_name, smithery_slug, default_enabled, sort_order, is_active)
VALUES
  (
    'context7',
    'Context7',
    'Get up-to-date documentation and code examples for any library or framework. Provides accurate, version-specific context for development.',
    'https://server.smithery.ai/@upstash/context7-mcp',
    false,
    false,
    null,
    '@upstash/context7-mcp',
    false,
    19,
    true
  )
ON CONFLICT (slug) DO NOTHING;
