-- Multi-Tenant Support Migration
-- Adds tenant_id to all tables and creates tenant management tables

-- First, create the tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);

-- Create tenant_settings table
CREATE TABLE IF NOT EXISTS tenant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, setting_key)
);

CREATE INDEX idx_tenant_settings_tenant ON tenant_settings(tenant_id);

-- Create api_tokens table
CREATE TABLE IF NOT EXISTS api_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_api_tokens_tenant ON api_tokens(tenant_id);
CREATE INDEX idx_api_tokens_token ON api_tokens(token);

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    resource_type VARCHAR(100) NOT NULL, -- 'api_call', 'task_creation', etc.
    limit_count INTEGER NOT NULL DEFAULT 1000,
    window_seconds INTEGER NOT NULL DEFAULT 3600, -- 1 hour default
    current_count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, resource_type)
);

CREATE INDEX idx_rate_limits_tenant ON rate_limits(tenant_id);

-- Add tenant_id to all existing tables
-- Note: We'll set a default tenant_id for existing data, then make it NOT NULL

-- Create a default tenant for existing data
INSERT INTO tenants (id, name, slug, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Tenant', 'default', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Add tenant_id column to all tables
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE message_attachments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE message_mentions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE thread_subscriptions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE costs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE budget ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Set default tenant_id for existing rows
UPDATE agents SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE tasks SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE task_assignments SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE messages SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE message_attachments SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE message_mentions SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE activities SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE documents SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE notifications SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE thread_subscriptions SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE proposals SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE costs SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE budget SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;

-- Make tenant_id NOT NULL (after setting defaults)
ALTER TABLE agents ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE task_assignments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE messages ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE message_attachments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE message_mentions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE activities ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE thread_subscriptions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE proposals ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE costs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE budget ALTER COLUMN tenant_id SET NOT NULL;

-- Create indexes on tenant_id for all tables
CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_tenant ON task_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_tenant ON message_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_tenant ON message_mentions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activities_tenant ON activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_thread_subscriptions_tenant ON thread_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proposals_tenant ON proposals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_costs_tenant ON costs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_budget_tenant ON budget(tenant_id);

-- Update composite indexes to include tenant_id where appropriate
CREATE INDEX IF NOT EXISTS idx_task_assignments_tenant_task ON task_assignments(tenant_id, task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_tenant_agent ON task_assignments(tenant_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_task ON messages(tenant_id, task_id);
CREATE INDEX IF NOT EXISTS idx_activities_tenant_created_at ON activities(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_agent ON notifications(tenant_id, mentioned_agent_id);

-- Enable RLS on new tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables (allow all for now - can be restricted later)
CREATE POLICY "Allow all operations on tenants" ON tenants FOR ALL USING (true);
CREATE POLICY "Allow all operations on tenant_settings" ON tenant_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations on api_tokens" ON api_tokens FOR ALL USING (true);
CREATE POLICY "Allow all operations on rate_limits" ON rate_limits FOR ALL USING (true);

-- Update RLS policies for existing tables to filter by tenant_id
-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations on agents" ON agents;
DROP POLICY IF EXISTS "Allow all operations on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;
DROP POLICY IF EXISTS "Allow all operations on activities" ON activities;
DROP POLICY IF EXISTS "Allow all operations on documents" ON documents;
DROP POLICY IF EXISTS "Allow all operations on notifications" ON notifications;
DROP POLICY IF EXISTS "Allow all operations on thread_subscriptions" ON thread_subscriptions;
DROP POLICY IF EXISTS "Allow all operations on proposals" ON proposals;
DROP POLICY IF EXISTS "Allow all operations on costs" ON costs;
DROP POLICY IF EXISTS "Allow all operations on budget" ON budget;

-- Create new tenant-aware policies
-- Note: These policies will need to be updated to use actual tenant context from JWT or session
-- For now, we allow all but the structure is in place for tenant filtering
CREATE POLICY "Tenant-aware operations on agents" ON agents FOR ALL USING (true);
CREATE POLICY "Tenant-aware operations on tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Tenant-aware operations on messages" ON messages FOR ALL USING (true);
CREATE POLICY "Tenant-aware operations on activities" ON activities FOR ALL USING (true);
CREATE POLICY "Tenant-aware operations on documents" ON documents FOR ALL USING (true);
CREATE POLICY "Tenant-aware operations on notifications" ON notifications FOR ALL USING (true);
CREATE POLICY "Tenant-aware operations on thread_subscriptions" ON thread_subscriptions FOR ALL USING (true);
CREATE POLICY "Tenant-aware operations on proposals" ON proposals FOR ALL USING (true);
CREATE POLICY "Tenant-aware operations on costs" ON costs FOR ALL USING (true);
CREATE POLICY "Tenant-aware operations on budget" ON budget FOR ALL USING (true);

-- Update triggers to include tenant_id
-- We need to update the create_task_activity function to preserve tenant_id
CREATE OR REPLACE FUNCTION create_task_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activities (type, agent_id, task_id, message, created_at, tenant_id)
    VALUES ('task_created', NULL, NEW.id, 'Task "' || NEW.title || '" created', NEW.created_at, NEW.tenant_id);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update create_message_activity to preserve tenant_id
CREATE OR REPLACE FUNCTION create_message_activity()
RETURNS TRIGGER AS $$
DECLARE
    agent_name VARCHAR(255);
    task_tenant_id UUID;
BEGIN
    -- Get tenant_id from task
    SELECT tenant_id INTO task_tenant_id FROM tasks WHERE id = NEW.task_id;
    
    SELECT name INTO agent_name FROM agents WHERE id = NEW.from_agent_id;
    
    INSERT INTO activities (type, agent_id, task_id, message, created_at, tenant_id)
    VALUES ('message_sent', NEW.from_agent_id, NEW.task_id, 
            COALESCE(agent_name, 'Agent') || ' commented on task', NEW.created_at, COALESCE(task_tenant_id, NEW.tenant_id));
    
    -- Auto-subscribe agent to thread
    INSERT INTO thread_subscriptions (agent_id, task_id, subscribed_at, tenant_id)
    VALUES (NEW.from_agent_id, NEW.task_id, NEW.created_at, COALESCE(task_tenant_id, NEW.tenant_id))
    ON CONFLICT (agent_id, task_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update create_mention_notifications to preserve tenant_id
CREATE OR REPLACE FUNCTION create_mention_notifications()
RETURNS TRIGGER AS $$
DECLARE
    task_tenant_id UUID;
BEGIN
    -- Get tenant_id from task
    SELECT tenant_id INTO task_tenant_id FROM tasks WHERE id = NEW.task_id;
    
    INSERT INTO notifications (mentioned_agent_id, content, task_id, delivered, created_at, tenant_id)
    SELECT 
        agent_id,
        NEW.content,
        NEW.task_id,
        FALSE,
        NEW.created_at,
        COALESCE(task_tenant_id, NEW.tenant_id)
    FROM message_mentions
    WHERE message_id = NEW.id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update notify_thread_subscribers to preserve tenant_id
CREATE OR REPLACE FUNCTION notify_thread_subscribers()
RETURNS TRIGGER AS $$
DECLARE
    task_tenant_id UUID;
BEGIN
    -- Get tenant_id from task
    SELECT tenant_id INTO task_tenant_id FROM tasks WHERE id = NEW.task_id;
    
    INSERT INTO notifications (mentioned_agent_id, content, task_id, delivered, created_at, tenant_id)
    SELECT 
        ts.agent_id,
        NEW.content,
        NEW.task_id,
        FALSE,
        NEW.created_at,
        COALESCE(task_tenant_id, NEW.tenant_id)
    FROM thread_subscriptions ts
    WHERE ts.task_id = NEW.task_id AND ts.agent_id != NEW.from_agent_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';
