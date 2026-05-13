ALTER TABLE agents ADD COLUMN acp_id TEXT;

-- Simple migration for existing common agents
UPDATE agents SET acp_id = 'gemini-cli' WHERE backend_type = 'gemini';
UPDATE agents SET acp_id = 'claude-code' WHERE backend_type = 'claude';
UPDATE agents SET acp_id = 'cursor-agent' WHERE backend_type = 'cursor';

-- Set default for any remaining
UPDATE agents SET acp_id = 'gemini-cli' WHERE acp_id IS NULL;

-- Remove old columns (Requires SQLite 3.35.0+)
ALTER TABLE agents DROP COLUMN backend_type;
ALTER TABLE agents DROP COLUMN cli_path;
