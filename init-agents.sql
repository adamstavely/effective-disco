-- Initialize Mission Control Agents
-- Run this after the schema has been applied

-- Insert agents (will skip if they already exist)
INSERT INTO agents (name, role, session_key, level, status, last_heartbeat)
VALUES 
  ('Jarvis', 'Squad Lead', 'agent:main:main', 'lead', 'idle', EXTRACT(EPOCH FROM NOW()) * 1000),
  ('Shuri', 'Product Analyst', 'agent:product-analyst:main', 'specialist', 'idle', EXTRACT(EPOCH FROM NOW()) * 1000),
  ('Friday', 'Developer', 'agent:developer:main', 'specialist', 'idle', EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (session_key) DO NOTHING;

-- Verify agents were created
SELECT name, role, level, status FROM agents ORDER BY name;
