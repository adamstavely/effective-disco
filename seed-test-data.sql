-- Seed Test Data for Mission Control
-- This script creates comprehensive test data to verify all features are working correctly
-- Run this after schema and agents are initialized

-- Use the default tenant ID (hardcoded for compatibility)
DO $$
DECLARE
    default_tenant_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- First, ensure default tenant exists
    INSERT INTO tenants (id, name, slug, created_at, updated_at)
    VALUES (default_tenant_id, 'Default Tenant', 'default', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Get agent IDs (assuming they exist from init-agents.sql)
DO $$
DECLARE
    default_tenant_id UUID := '00000000-0000-0000-0000-000000000000';
    jarvis_id UUID;
    shuri_id UUID;
    friday_id UUID;
    task1_id UUID;
    task2_id UUID;
    task3_id UUID;
    task4_id UUID;
    task5_id UUID;
    task6_id UUID;
    task7_id UUID;
    task8_id UUID;
    doc1_id UUID;
    doc2_id UUID;
    doc3_id UUID;
    msg1_id UUID;
    msg2_id UUID;
    msg3_id UUID;
    msg4_id UUID;
    msg5_id UUID;
    chat_thread1_id UUID;
    proposal1_id UUID;
    proposal2_id UUID;
    proposal3_id UUID;
    now_ts BIGINT;
BEGIN
    -- Get current timestamp as BIGINT
    now_ts := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
    
    -- Ensure all agents have tenant_id set (fix for agents created before multi-tenant migration)
    UPDATE agents 
    SET tenant_id = default_tenant_id
    WHERE tenant_id IS NULL;
    
    -- Get agent IDs
    SELECT id INTO jarvis_id FROM agents WHERE name = 'Jarvis' LIMIT 1;
    SELECT id INTO shuri_id FROM agents WHERE name = 'Shuri' LIMIT 1;
    SELECT id INTO friday_id FROM agents WHERE name = 'Friday' LIMIT 1;
    
    -- Check if agents exist
    IF jarvis_id IS NULL OR shuri_id IS NULL OR friday_id IS NULL THEN
        RAISE EXCEPTION 'Agents not found! Please run init-agents.sql first to create Jarvis, Shuri, and Friday.';
    END IF;
    
    -- Update agents with more details
    UPDATE agents SET 
        avatar = '🤖',
        role_tag = 'lead',
        system_prompt = 'You are Jarvis, a strategic squad lead who coordinates team efforts and makes high-level decisions.',
        character = 'Analytical, decisive, and always thinking three steps ahead.',
        lore = 'Jarvis has been leading teams for years and has a reputation for getting things done efficiently.',
        tenant_id = default_tenant_id
    WHERE id = jarvis_id;
    
    UPDATE agents SET 
        avatar = '🔬',
        role_tag = 'analyst',
        system_prompt = 'You are Shuri, a product analyst who excels at understanding user needs and market trends.',
        character = 'Curious, detail-oriented, and passionate about user experience.',
        lore = 'Shuri joined the team after years of product research and brings deep analytical skills.',
        tenant_id = default_tenant_id
    WHERE id = shuri_id;
    
    UPDATE agents SET 
        avatar = '💻',
        role_tag = 'dev',
        system_prompt = 'You are Friday, a skilled developer who builds robust and scalable solutions.',
        character = 'Practical, solution-focused, and always learning new technologies.',
        lore = 'Friday is known for writing clean code and solving complex technical challenges.',
        tenant_id = default_tenant_id
    WHERE id = friday_id;
    
    -- Create tasks with various statuses and priorities
    INSERT INTO tasks (title, description, status, priority, tags, border_color, started_at, last_message_at, created_at, updated_at, tenant_id)
    VALUES 
        ('Design User Authentication Flow', 
         'Create a comprehensive authentication system with OAuth support, password reset, and multi-factor authentication. Include wireframes and user flow diagrams.',
         'in_progress', 'high', ARRAY['auth', 'security', 'ux'], '#FF6B6B', now_ts - 86400000, now_ts - 3600000, now_ts - 86400000, now_ts - 3600000, default_tenant_id)
    RETURNING id INTO task1_id;
    
    INSERT INTO tasks (title, description, status, priority, tags, border_color, started_at, last_message_at, created_at, updated_at, tenant_id)
    VALUES 
        ('Implement API Rate Limiting', 
         'Add rate limiting middleware to prevent API abuse. Should support per-user and per-IP limits with configurable windows.',
         'review', 'high', ARRAY['backend', 'security', 'api'], '#4ECDC4', now_ts - 172800000, now_ts - 7200000, now_ts - 172800000, now_ts - 7200000, default_tenant_id)
    RETURNING id INTO task2_id;
    
    INSERT INTO tasks (title, description, status, priority, tags, border_color, started_at, created_at, updated_at, tenant_id)
    VALUES 
        ('Research Competitor Features', 
         'Analyze top 5 competitors and document their key features, pricing models, and user feedback. Create comparison matrix.',
         'assigned', 'medium', ARRAY['research', 'competitive-analysis'], '#95E1D3', now_ts - 259200000, now_ts - 259200000, now_ts - 259200000, default_tenant_id)
    RETURNING id INTO task3_id;
    
    INSERT INTO tasks (title, description, status, priority, tags, border_color, created_at, updated_at, tenant_id)
    VALUES 
        ('Write Documentation for New API', 
         'Create comprehensive API documentation including endpoints, request/response examples, error codes, and authentication requirements.',
         'inbox', 'medium', ARRAY['documentation', 'api'], '#F38181', now_ts - 43200000, now_ts - 43200000, default_tenant_id)
    RETURNING id INTO task4_id;
    
    INSERT INTO tasks (title, description, status, priority, tags, border_color, started_at, last_message_at, created_at, updated_at, tenant_id)
    VALUES 
        ('Optimize Database Queries', 
         'Review slow queries and optimize them. Add indexes where needed and refactor complex joins. Target 50% performance improvement.',
         'done', 'high', ARRAY['database', 'performance', 'optimization'], '#AA96DA', now_ts - 345600000, now_ts - 86400000, now_ts - 345600000, now_ts - 86400000, default_tenant_id)
    RETURNING id INTO task5_id;
    
    INSERT INTO tasks (title, description, status, priority, tags, border_color, started_at, created_at, updated_at, tenant_id)
    VALUES 
        ('Setup CI/CD Pipeline', 
         'Configure GitHub Actions for automated testing, building, and deployment. Include staging and production environments.',
         'blocked', 'medium', ARRAY['devops', 'ci-cd', 'automation'], '#FCBAD3', now_ts - 518400000, now_ts - 518400000, now_ts - 518400000, default_tenant_id)
    RETURNING id INTO task6_id;
    
    INSERT INTO tasks (title, description, status, priority, tags, border_color, started_at, last_message_at, created_at, updated_at, tenant_id)
    VALUES 
        ('Create User Onboarding Flow', 
         'Design and implement an interactive onboarding experience for new users. Include tutorials, tooltips, and progress tracking.',
         'in_progress', 'medium', ARRAY['onboarding', 'ux', 'feature'], '#A8E6CF', now_ts - 172800000, now_ts - 1800000, now_ts - 172800000, now_ts - 1800000, default_tenant_id)
    RETURNING id INTO task7_id;
    
    INSERT INTO tasks (title, description, status, priority, tags, border_color, started_at, last_message_at, created_at, updated_at, tenant_id)
    VALUES 
        ('Migrate Legacy System', 
         'Plan and execute migration from legacy system to new architecture. Ensure zero downtime and data integrity.',
         'archived', 'high', ARRAY['migration', 'legacy', 'infrastructure'], '#FFD3A5', now_ts - 604800000, now_ts - 259200000, now_ts - 604800000, now_ts - 259200000, default_tenant_id)
    RETURNING id INTO task8_id;
    
    -- Create task assignments
    -- Note: task_assignments.created_at is TIMESTAMPTZ, so convert from BIGINT
    INSERT INTO task_assignments (task_id, agent_id, created_at, tenant_id)
    VALUES 
        (task1_id, shuri_id, to_timestamp((now_ts - 86400000) / 1000), default_tenant_id),
        (task1_id, friday_id, to_timestamp((now_ts - 86400000) / 1000), default_tenant_id),
        (task2_id, friday_id, to_timestamp((now_ts - 172800000) / 1000), default_tenant_id),
        (task3_id, shuri_id, to_timestamp((now_ts - 259200000) / 1000), default_tenant_id),
        (task4_id, friday_id, to_timestamp((now_ts - 43200000) / 1000), default_tenant_id),
        (task5_id, friday_id, to_timestamp((now_ts - 345600000) / 1000), default_tenant_id),
        (task6_id, jarvis_id, to_timestamp((now_ts - 518400000) / 1000), default_tenant_id),
        (task7_id, shuri_id, to_timestamp((now_ts - 172800000) / 1000), default_tenant_id),
        (task7_id, friday_id, to_timestamp((now_ts - 172800000) / 1000), default_tenant_id),
        (task8_id, jarvis_id, to_timestamp((now_ts - 604800000) / 1000), default_tenant_id);
    
    -- Update agents' current_task_id
    UPDATE agents SET current_task_id = task1_id WHERE id = shuri_id;
    UPDATE agents SET current_task_id = task2_id WHERE id = friday_id;
    UPDATE agents SET status = 'active' WHERE id IN (shuri_id, friday_id);
    
    -- Create messages (task comments)
    INSERT INTO messages (task_id, from_agent_id, content, created_at, tenant_id)
    VALUES 
        (task1_id, shuri_id, 'I''ve completed the initial wireframes for the authentication flow. The OAuth integration looks straightforward, but we need to decide on the MFA approach - SMS or authenticator app?', now_ts - 7200000, default_tenant_id)
    RETURNING id INTO msg1_id;
    
    INSERT INTO messages (task_id, from_agent_id, content, created_at, tenant_id)
    VALUES 
        (task1_id, friday_id, 'I recommend authenticator apps for better security. We can use TOTP (Time-based One-Time Password) which is industry standard. @Shuri what do you think?', now_ts - 5400000, default_tenant_id)
    RETURNING id INTO msg2_id;
    
    INSERT INTO messages (task_id, from_agent_id, content, created_at, tenant_id)
    VALUES 
        (task2_id, friday_id, 'Rate limiting implementation is complete. I''ve added support for both per-user and per-IP limits with configurable windows. Ready for review!', now_ts - 10800000, default_tenant_id)
    RETURNING id INTO msg3_id;
    
    INSERT INTO messages (task_id, from_agent_id, content, created_at, tenant_id)
    VALUES 
        (task2_id, jarvis_id, 'Great work! I''ve reviewed the code and it looks solid. One suggestion: add Redis caching for rate limit counters to improve performance at scale.', now_ts - 7200000, default_tenant_id)
    RETURNING id INTO msg4_id;
    
    INSERT INTO messages (task_id, from_agent_id, content, created_at, tenant_id)
    VALUES 
        (task7_id, shuri_id, 'The onboarding flow is coming along nicely. I''ve added progress tracking and interactive tutorials. @Friday can you help integrate the tooltips component?', now_ts - 3600000, default_tenant_id)
    RETURNING id INTO msg5_id;
    
    -- Create message mentions
    -- Note: message_mentions.created_at is TIMESTAMPTZ
    INSERT INTO message_mentions (message_id, agent_id, created_at, tenant_id)
    VALUES 
        (msg2_id, shuri_id, to_timestamp((now_ts - 5400000) / 1000), default_tenant_id),
        (msg5_id, friday_id, to_timestamp((now_ts - 3600000) / 1000), default_tenant_id);
    
    -- Create documents
    INSERT INTO documents (title, content, type, task_id, created_by, path, created_at, tenant_id)
    VALUES 
        ('Auth Flow Wireframes', 
         '# Authentication Flow Wireframes\n\n## Login Screen\n- Email/password input\n- OAuth buttons (Google, GitHub)\n- "Forgot password" link\n\n## MFA Setup\n- QR code for authenticator app\n- Backup codes\n\n## Password Reset\n- Email verification\n- New password form',
         'deliverable', task1_id, shuri_id, '/documents/auth-wireframes.md', now_ts - 7200000, default_tenant_id)
    RETURNING id INTO doc1_id;
    
    INSERT INTO documents (title, content, type, task_id, created_by, path, created_at, tenant_id)
    VALUES 
        ('Rate Limiting Implementation Guide', 
         '# Rate Limiting Implementation\n\n## Configuration\n- Per-user: 1000 requests/hour\n- Per-IP: 5000 requests/hour\n- Window: 3600 seconds\n\n## Implementation Details\n- Middleware-based approach\n- Token bucket algorithm\n- Redis caching (optional)',
         'protocol', task2_id, friday_id, '/documents/rate-limiting.md', now_ts - 10800000, default_tenant_id)
    RETURNING id INTO doc2_id;
    
    INSERT INTO documents (title, content, type, task_id, created_by, path, created_at, tenant_id)
    VALUES 
        ('Competitor Analysis Report', 
         '# Competitor Analysis\n\n## Competitor 1: Acme Corp\n- Features: A, B, C\n- Pricing: $99/month\n- User feedback: 4.2/5\n\n## Competitor 2: Beta Inc\n- Features: A, D, E\n- Pricing: $149/month\n- User feedback: 4.5/5\n\n[Full analysis continues...]',
         'research', task3_id, shuri_id, '/documents/competitor-analysis.md', now_ts - 172800000, default_tenant_id)
    RETURNING id INTO doc3_id;
    
    -- Link documents to messages
    UPDATE documents SET message_id = msg1_id WHERE id = doc1_id;
    UPDATE documents SET message_id = msg3_id WHERE id = doc2_id;
    
    -- Create message attachments
    -- Note: message_attachments.created_at is TIMESTAMPTZ
    INSERT INTO message_attachments (message_id, document_id, created_at, tenant_id)
    VALUES 
        (msg1_id, doc1_id, to_timestamp((now_ts - 7200000) / 1000), default_tenant_id),
        (msg3_id, doc2_id, to_timestamp((now_ts - 10800000) / 1000), default_tenant_id);
    
    -- Create chat threads
    -- Note: chat_threads.created_at and updated_at are BIGINT
    INSERT INTO chat_threads (title, created_by, agent_id, created_at, updated_at, tenant_id)
    VALUES 
        ('Quick question about API', jarvis_id, friday_id, now_ts - 1800000, now_ts - 1800000, default_tenant_id)
    RETURNING id INTO chat_thread1_id;
    
    -- Create chat messages (user messages have NULL from_agent_id)
    INSERT INTO messages (chat_thread_id, from_agent_id, content, created_at, tenant_id)
    VALUES 
        (chat_thread1_id, NULL, 'Hey Friday, can you help me understand the rate limiting implementation?', now_ts - 1800000, default_tenant_id),
        (chat_thread1_id, friday_id, 'Sure! The rate limiting uses a token bucket algorithm. Each user gets a bucket with tokens that refill over time.', now_ts - 1500000, default_tenant_id),
        (chat_thread1_id, NULL, 'That makes sense. What about Redis caching?', now_ts - 1200000, default_tenant_id),
        (chat_thread1_id, friday_id, 'Redis is optional but recommended for high-traffic scenarios. It stores the rate limit counters in memory for faster access.', now_ts - 900000, default_tenant_id);
    
    -- Create proposals
    -- Note: created_at, updated_at, approved_at, rejected_at are all BIGINT
    INSERT INTO proposals (title, description, source, priority, status, proposed_steps, created_at, updated_at, approved_at, tenant_id)
    VALUES 
        ('Add Dark Mode Support', 
         'Implement a dark mode theme for the application to improve user experience during night-time usage and reduce eye strain.',
         'Shuri', 'medium', 'pending', 
         '["Research color schemes", "Create dark theme palette", "Implement theme toggle", "Add user preference storage", "Test across all components"]'::jsonb,
         (now_ts - 86400000)::BIGINT, (now_ts - 86400000)::BIGINT, NULL, default_tenant_id)
    RETURNING id INTO proposal1_id;
    
    INSERT INTO proposals (title, description, source, priority, status, proposed_steps, created_at, updated_at, approved_at, tenant_id)
    VALUES 
        ('Implement Real-time Notifications', 
         'Add a real-time notification system using WebSockets to notify users of important events and updates.',
         'Friday', 'high', 'approved',
         '["Setup WebSocket server", "Create notification service", "Design notification UI", "Add notification preferences", "Test real-time delivery"]'::jsonb,
         (now_ts - 172800000)::BIGINT, (now_ts - 172800000)::BIGINT, (now_ts - 129600000)::BIGINT, default_tenant_id)
    RETURNING id INTO proposal2_id;
    
    INSERT INTO proposals (title, description, source, priority, status, proposed_steps, created_at, updated_at, rejected_at, tenant_id)
    VALUES 
        ('Add Social Media Integration', 
         'Integrate with social media platforms to allow users to share content and login via social accounts.',
         'system', 'low', 'rejected',
         '["Research OAuth providers", "Implement OAuth flow", "Add sharing features", "Create UI components"]'::jsonb,
         (now_ts - 259200000)::BIGINT, (now_ts - 259200000)::BIGINT, (now_ts - 216000000)::BIGINT, default_tenant_id)
    RETURNING id INTO proposal3_id;
    
    -- Create costs
    -- Note: metadata is JSONB, created_at is BIGINT
    INSERT INTO costs (agent_id, amount, source, metadata, created_at, tenant_id)
    VALUES 
        (jarvis_id, 2.45, 'llm_api', jsonb_build_object('model', 'gpt-4', 'tokens', 1500, 'task_id', task1_id::text), (now_ts - 3600000)::BIGINT, default_tenant_id),
        (shuri_id, 1.85, 'llm_api', jsonb_build_object('model', 'gpt-4', 'tokens', 1200, 'task_id', task3_id::text), (now_ts - 7200000)::BIGINT, default_tenant_id),
        (friday_id, 3.20, 'llm_api', jsonb_build_object('model', 'gpt-4', 'tokens', 2000, 'task_id', task2_id::text), (now_ts - 10800000)::BIGINT, default_tenant_id),
        (friday_id, 0.50, 'tool_usage', jsonb_build_object('tool', 'code_execution', 'duration', 300, 'task_id', task2_id::text), (now_ts - 14400000)::BIGINT, default_tenant_id),
        (jarvis_id, 1.20, 'llm_api', jsonb_build_object('model', 'gpt-3.5-turbo', 'tokens', 800, 'task_id', task6_id::text), (now_ts - 18000000)::BIGINT, default_tenant_id),
        (shuri_id, 2.10, 'llm_api', jsonb_build_object('model', 'gpt-4', 'tokens', 1400, 'task_id', task7_id::text), (now_ts - 21600000)::BIGINT, default_tenant_id);
    
    -- Create budget
    INSERT INTO budget (daily_limit, monthly_limit, current_daily_spend, current_monthly_spend, updated_at, tenant_id)
    VALUES 
        (100.00, 2000.00, 11.30, 245.50, NOW(), default_tenant_id)
    ON CONFLICT DO NOTHING;
    
    -- Create thread subscriptions
    -- Note: thread_subscriptions.subscribed_at is BIGINT, so keep as is
    INSERT INTO thread_subscriptions (agent_id, task_id, subscribed_at, tenant_id)
    VALUES 
        (shuri_id, task1_id, now_ts - 86400000, default_tenant_id),
        (friday_id, task1_id, now_ts - 86400000, default_tenant_id),
        (friday_id, task2_id, now_ts - 172800000, default_tenant_id),
        (jarvis_id, task2_id, now_ts - 172800000, default_tenant_id),
        (shuri_id, task3_id, now_ts - 259200000, default_tenant_id),
        (shuri_id, task7_id, now_ts - 172800000, default_tenant_id),
        (friday_id, task7_id, now_ts - 172800000, default_tenant_id)
    ON CONFLICT (agent_id, task_id) DO NOTHING;
    
    -- Create notifications (some delivered, some not)
    -- Note: notifications.created_at is BIGINT
    INSERT INTO notifications (mentioned_agent_id, content, task_id, delivered, created_at, tenant_id)
    VALUES 
        (shuri_id, 'I recommend authenticator apps for better security. We can use TOTP (Time-based One-Time Password) which is industry standard. @Shuri what do you think?', task1_id, TRUE, now_ts - 5400000, default_tenant_id),
        (friday_id, 'The onboarding flow is coming along nicely. I''ve added progress tracking and interactive tutorials. @Friday can you help integrate the tooltips component?', task7_id, FALSE, now_ts - 3600000, default_tenant_id);
    
    -- Create additional activities (beyond what triggers create)
    -- Note: created_at in activities is BIGINT, not TIMESTAMPTZ
    INSERT INTO activities (type, agent_id, task_id, message, event_tag, originator, created_at, tenant_id)
    VALUES 
        ('step_completed', friday_id, task2_id, 'Friday completed step: Implement rate limiting middleware', 'step', 'Friday', (now_ts - 14400000)::BIGINT, default_tenant_id),
        ('step_completed', shuri_id, task1_id, 'Shuri completed step: Create authentication wireframes', 'step', 'Shuri', (now_ts - 10800000)::BIGINT, default_tenant_id),
        ('task_status_changed', jarvis_id, task2_id, 'Jarvis changed task status to review', 'status_change', 'Jarvis', (now_ts - 10800000)::BIGINT, default_tenant_id),
        ('step_completed', friday_id, task5_id, 'Friday completed step: Optimize slow query #1', 'step', 'Friday', (now_ts - 259200000)::BIGINT, default_tenant_id),
        ('step_completed', friday_id, task5_id, 'Friday completed step: Add database indexes', 'step', 'Friday', (now_ts - 172800000)::BIGINT, default_tenant_id),
        ('task_status_changed', jarvis_id, task5_id, 'Jarvis marked task as done', 'status_change', 'Jarvis', (now_ts - 86400000)::BIGINT, default_tenant_id),
        ('step_completed', shuri_id, task7_id, 'Shuri completed step: Design onboarding flow', 'step', 'Shuri', (now_ts - 7200000)::BIGINT, default_tenant_id),
        ('step_completed', friday_id, task7_id, 'Friday completed step: Implement progress tracking', 'step', 'Friday', (now_ts - 5400000)::BIGINT, default_tenant_id);
    
    RAISE NOTICE 'Test data created successfully!';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - 8 tasks (various statuses)';
    RAISE NOTICE '  - 10 task assignments';
    RAISE NOTICE '  - 5 task messages';
    RAISE NOTICE '  - 4 chat messages';
    RAISE NOTICE '  - 3 documents';
    RAISE NOTICE '  - 3 proposals';
    RAISE NOTICE '  - 6 cost records';
    RAISE NOTICE '  - 1 budget record';
    RAISE NOTICE '  - 7 thread subscriptions';
    RAISE NOTICE '  - 2 notifications';
    RAISE NOTICE '  - 8 additional activities';
END $$;

-- Verify the data
SELECT 'Agents' as table_name, COUNT(*) as count FROM agents WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 'Tasks', COUNT(*) FROM tasks WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 'Task Assignments', COUNT(*) FROM task_assignments WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 'Messages', COUNT(*) FROM messages WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 'Documents', COUNT(*) FROM documents WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 'Proposals', COUNT(*) FROM proposals WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 'Costs', COUNT(*) FROM costs WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 'Activities', COUNT(*) FROM activities WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 'Notifications', COUNT(*) FROM notifications WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 'Thread Subscriptions', COUNT(*) FROM thread_subscriptions WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 'Chat Threads', COUNT(*) FROM chat_threads WHERE tenant_id = '00000000-0000-0000-0000-000000000000';

-- Show sample tasks with their status
SELECT status, COUNT(*) as count 
FROM tasks 
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
GROUP BY status 
ORDER BY status;

-- Show sample agents with their current status
SELECT name, role, status, current_task_id IS NOT NULL as has_current_task
FROM agents 
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
ORDER BY name;
