/*
  # Add Smithery config key mapping to MCP servers

  1. Modified Tables
    - `mcp_servers`
      - Added `smithery_config_key` (text, nullable) - The field name that Smithery's config schema expects for the API key (e.g., 'apiKey' for AgentMail)
  
  2. Data Updates
    - Set `smithery_config_key` to 'apiKey' for Agentmail server (matches Smithery registry schema)

  3. Notes
    - When creating Smithery connections, this field name is used as the header key
    - Falls back to `api_key_name` if not set
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mcp_servers' AND column_name = 'smithery_config_key'
  ) THEN
    ALTER TABLE mcp_servers ADD COLUMN smithery_config_key text;
  END IF;
END $$;

UPDATE mcp_servers 
SET smithery_config_key = 'apiKey' 
WHERE slug = 'agentmail' AND smithery_config_key IS NULL;