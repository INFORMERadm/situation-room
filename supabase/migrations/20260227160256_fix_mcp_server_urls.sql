/*
  # Fix MCP server URLs

  1. Changes
    - Update `mcp_servers` base_url values to use correct Smithery server paths
    - Old URLs used `@anthropic-ai/` prefix which returns 404
    - New URLs use the correct top-level qualified names from Smithery registry

  2. Affected servers
    - gmail: `@anthropic-ai/gmail` -> `gmail`
    - google-calendar: `@anthropic-ai/google-calendar` -> `googlecalendar`
    - google-drive: `@anthropic-ai/google-drive` -> `googledrive`
    - notion: `@anthropic-ai/notion` -> `notion`
    - slack: `@anthropic-ai/slack` -> `slack`
    - github: `@anthropic-ai/github` -> `github`
*/

UPDATE mcp_servers SET base_url = 'https://server.smithery.ai/gmail' WHERE slug = 'google-gmail';
UPDATE mcp_servers SET base_url = 'https://server.smithery.ai/googlecalendar' WHERE slug = 'google-calendar';
UPDATE mcp_servers SET base_url = 'https://server.smithery.ai/googledrive' WHERE slug = 'google-drive';
UPDATE mcp_servers SET base_url = 'https://server.smithery.ai/notion' WHERE slug = 'notion';
UPDATE mcp_servers SET base_url = 'https://server.smithery.ai/slack' WHERE slug = 'slack';
UPDATE mcp_servers SET base_url = 'https://server.smithery.ai/github' WHERE slug = 'github';
