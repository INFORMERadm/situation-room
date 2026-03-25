/*
  # Add Polymarket MCP to server catalog

  1. New Catalog Entry
    - `polymarket` -- Polymarket prediction markets data via Smithery
    - Listed at polymarket-mcp--aryankeluskar.run.tools
    - Sort order 23

  2. Details
    - slug: polymarket
    - name: Polymarket
    - base_url: https://server.smithery.ai/aryankeluskar/polymarket-mcp
    - requires_oauth: false
    - requires_api_key: false
    - smithery_slug: aryankeluskar/polymarket-mcp

  3. Important Notes
    - Uses ON CONFLICT to safely handle re-runs
    - No OAuth or API key required
    - Follows identical pattern to previous MCP integrations
    - Provides AI with ability to query prediction market data, odds, and event outcomes from Polymarket
*/

INSERT INTO mcp_servers (slug, name, description, base_url, requires_api_key, requires_oauth, api_key_name, smithery_slug, default_enabled, sort_order, is_active)
VALUES
  (
    'polymarket',
    'Polymarket',
    'Access prediction market data from Polymarket. Query event odds, market prices, trading volumes, and outcome probabilities for real-world events.',
    'https://server.smithery.ai/aryankeluskar/polymarket-mcp',
    false,
    false,
    null,
    'aryankeluskar/polymarket-mcp',
    false,
    23,
    true
  )
ON CONFLICT (slug) DO NOTHING;
