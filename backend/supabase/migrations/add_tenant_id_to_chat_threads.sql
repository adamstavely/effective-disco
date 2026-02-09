-- Add tenant_id to chat_threads table for multi-tenant support
-- This was missing from the original add_multi_tenant_support.sql migration

-- Add tenant_id column if it doesn't exist
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Set default tenant_id for existing rows
UPDATE chat_threads SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;

-- Make tenant_id NOT NULL (after setting defaults)
ALTER TABLE chat_threads ALTER COLUMN tenant_id SET NOT NULL;

-- Create index on tenant_id
CREATE INDEX IF NOT EXISTS idx_chat_threads_tenant ON chat_threads(tenant_id);
