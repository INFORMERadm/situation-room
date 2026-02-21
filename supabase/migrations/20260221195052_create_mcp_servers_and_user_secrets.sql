/*
  # Create MCP Servers and User Secrets Tables

  ## Summary
  Sets up the infrastructure for managing MCP server integrations and storing
  user-specific secrets (API keys) needed to connect to those servers.

  ## New Tables

  ### 1. mcp_servers
  Catalog of available MCP server integrations that the system knows about.
  - `id` (uuid, PK) - unique identifier
  - `slug` (text, unique) - URL-safe identifier (e.g. "customgpt-mcp")
  - `name` (text) - display name (e.g. "CustomGPT")
  - `description` (text) - short description of what this MCP provides
  - `base_url` (text) - MCP server endpoint URL
  - `requires_api_key` (boolean) - whether a user API key is required
  - `api_key_name` (text) - env/secret key name used to look up the credential
  - `default_enabled` (boolean) - whether enabled for users by default
  - `sort_order` (integer) - display ordering
  - `is_active` (boolean) - whether this server is currently available
  - `created_at` (timestamptz)

  ### 2. user_secrets
  Stores user-supplied secrets (e.g. API keys for MCP servers) securely.
  - `id` (uuid, PK)
  - `user_id` (uuid, FK -> auth.users)
  - `key_name` (text) - name identifying the secret (e.g. "CustomGPT_API_KEY")
  - `encrypted_value` (text) - the secret value (stored as text; transport encrypted by TLS)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Only authenticated users can read active mcp_servers rows
  - Users can only read/write/delete their own user_secrets rows
  - Service role has full access to mcp_servers for seeding

  ## Seed Data
  - Inserts the CustomGPT MCP server entry
*/

CREATE TABLE IF NOT EXISTS mcp_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  base_url text NOT NULL,
  requires_api_key boolean NOT NULL DEFAULT false,
  api_key_name text,
  default_enabled boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active mcp_servers"
  ON mcp_servers FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE TABLE IF NOT EXISTS user_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_name text NOT NULL,
  encrypted_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key_name)
);

ALTER TABLE user_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own secrets"
  ON user_secrets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own secrets"
  ON user_secrets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own secrets"
  ON user_secrets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own secrets"
  ON user_secrets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO mcp_servers (slug, name, description, base_url, requires_api_key, api_key_name, default_enabled, sort_order, is_active)
VALUES (
  'customgpt-mcp',
  'CustomGPT',
  'Curated knowledge base for geopolitical, political, and social topics',
  'https://mcp.customgpt.ai/projects/79211/mcp/',
  true,
  'CustomGPT_API_KEY',
  false,
  2,
  true
)
ON CONFLICT (slug) DO NOTHING;
