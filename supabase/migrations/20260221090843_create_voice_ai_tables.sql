/*
  # Create Voice AI Support Tables

  ## New Tables

  ### mcp_tool_call_logs
  Logs every MCP tool call executed during voice AI sessions for observability and debugging.
  - `id` - UUID primary key
  - `created_at` - Timestamp of the call
  - `tool_name` - The MCP tool that was invoked
  - `server_url` - The MCP server URL that handled the call
  - `server_config` - Additional server config (e.g., Smithery namespace/connectionId)
  - `arguments` - The arguments passed to the tool
  - `status` - 'success' or 'error'
  - `result` - Tool result or error message (capped at 10000 chars)
  - `duration_ms` - How long the tool call took in milliseconds

  ## Security
  - RLS enabled on mcp_tool_call_logs
  - Only service_role can insert (edge functions use service_role key)
  - Authenticated users can read their own logs (future: link to user_id if needed)
*/

CREATE TABLE IF NOT EXISTS mcp_tool_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  tool_name text,
  server_url text,
  server_config jsonb,
  arguments jsonb,
  status text DEFAULT 'success',
  result text,
  duration_ms integer
);

ALTER TABLE mcp_tool_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert tool call logs"
  ON mcp_tool_call_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can select tool call logs"
  ON mcp_tool_call_logs
  FOR SELECT
  TO service_role
  USING (true);
