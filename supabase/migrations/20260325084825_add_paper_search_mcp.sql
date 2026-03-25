/*
  # Add Paper Search MCP to server catalog

  1. New Catalog Entry
    - `paper-search` -- Academic paper search MCP via Smithery
    - Listed at paper-search-mcp-openai-v2--titansneaker.run.tools
    - Sort order 21

  2. Details
    - slug: paper-search
    - name: Paper Search
    - base_url: https://server.smithery.ai/TitanSneaker/paper-search-mcp-openai-v2
    - requires_oauth: false
    - requires_api_key: false
    - smithery_slug: TitanSneaker/paper-search-mcp-openai-v2

  3. Important Notes
    - Uses ON CONFLICT to safely handle re-runs
    - No OAuth or API key required
    - Follows identical pattern to the Google Docs/Excel MCP integrations
    - Provides AI with ability to search academic papers and research
*/

INSERT INTO mcp_servers (slug, name, description, base_url, requires_api_key, requires_oauth, api_key_name, smithery_slug, default_enabled, sort_order, is_active)
VALUES
  (
    'paper-search',
    'Paper Search',
    'Search academic papers and research across multiple sources. Find papers by topic, author, or keywords with AI-powered relevance ranking.',
    'https://server.smithery.ai/TitanSneaker/paper-search-mcp-openai-v2',
    false,
    false,
    null,
    'TitanSneaker/paper-search-mcp-openai-v2',
    false,
    21,
    true
  )
ON CONFLICT (slug) DO NOTHING;
