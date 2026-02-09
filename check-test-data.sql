-- Quick script to check if test data exists
-- Run this to verify data was seeded correctly

-- Check tenant exists
SELECT 'Tenant Check' as check_type, COUNT(*) as count FROM tenants WHERE id = '00000000-0000-0000-0000-000000000000';

-- Check agents
SELECT 'Agents' as check_type, COUNT(*) as count, 
       STRING_AGG(name, ', ') as names
FROM agents 
WHERE tenant_id = '00000000-0000-0000-0000-000000000000';

-- Check tasks
SELECT 'Tasks' as check_type, COUNT(*) as count,
       STRING_AGG(status, ', ') as statuses
FROM tasks 
WHERE tenant_id = '00000000-0000-0000-0000-000000000000';

-- Check task assignments
SELECT 'Task Assignments' as check_type, COUNT(*) as count
FROM task_assignments 
WHERE tenant_id = '00000000-0000-0000-0000-000000000000';

-- Check messages
SELECT 'Messages' as check_type, COUNT(*) as count
FROM messages 
WHERE tenant_id = '00000000-0000-0000-0000-000000000000';

-- Show sample tasks
SELECT 'Sample Tasks' as check_type, title, status, priority, tags
FROM tasks 
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
ORDER BY created_at DESC
LIMIT 5;

-- Check if agents have tenant_id set
SELECT 'Agents Tenant Check' as check_type, name, tenant_id IS NOT NULL as has_tenant_id
FROM agents
ORDER BY name;
