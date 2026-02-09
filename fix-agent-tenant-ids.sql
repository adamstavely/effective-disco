-- Fix script: Ensure all agents have tenant_id set
-- This is critical because the frontend filters by tenant_id

-- First, ensure default tenant exists
DO $$
DECLARE
    default_tenant_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    INSERT INTO tenants (id, name, slug, created_at, updated_at)
    VALUES (default_tenant_id, 'Default Tenant', 'default', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Update all agents that don't have tenant_id set
UPDATE agents 
SET tenant_id = '00000000-0000-0000-0000-000000000000'
WHERE tenant_id IS NULL;

-- Verify agents have tenant_id
SELECT 
    name, 
    role, 
    tenant_id IS NOT NULL as has_tenant_id,
    tenant_id
FROM agents
ORDER BY name;
