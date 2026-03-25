/*
  # Add Weather MCP to server catalog

  1. New Catalog Entry
    - `weather` -- Weather data MCP via Smithery
    - Listed at mcp_weather_server--isdaniel.run.tools
    - Sort order 22

  2. Details
    - slug: weather
    - name: Weather
    - base_url: https://server.smithery.ai/isdaniel/mcp_weather_server
    - requires_oauth: false
    - requires_api_key: false
    - smithery_slug: isdaniel/mcp_weather_server

  3. Important Notes
    - Uses ON CONFLICT to safely handle re-runs
    - No OAuth or API key required
    - Follows identical pattern to previous MCP integrations
    - Provides AI with ability to look up weather data and forecasts
*/

INSERT INTO mcp_servers (slug, name, description, base_url, requires_api_key, requires_oauth, api_key_name, smithery_slug, default_enabled, sort_order, is_active)
VALUES
  (
    'weather',
    'Weather',
    'Get current weather conditions and forecasts for any location worldwide. Look up temperature, humidity, wind, and other meteorological data.',
    'https://server.smithery.ai/isdaniel/mcp_weather_server',
    false,
    false,
    null,
    'isdaniel/mcp_weather_server',
    false,
    22,
    true
  )
ON CONFLICT (slug) DO NOTHING;
