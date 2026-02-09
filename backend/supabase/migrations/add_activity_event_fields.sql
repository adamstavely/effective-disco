-- Enhanced Live Event Stream Migration
-- Adds event_tag and originator fields to activities table for better event tracking

-- Add event_tag column to activities table
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS event_tag VARCHAR(100);

-- Add originator column to activities table
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS originator VARCHAR(255);

-- Create index on event_tag for filtering
CREATE INDEX IF NOT EXISTS idx_activities_event_tag ON activities(event_tag);

-- Update existing activities to set default values based on type
UPDATE activities 
SET 
  event_tag = CASE 
    WHEN type LIKE '%created' THEN 'creation'
    WHEN type LIKE '%completed' OR type LIKE '%done' THEN 'completion'
    WHEN type LIKE '%failed' OR type LIKE '%error' THEN 'failure'
    WHEN type LIKE '%sent' OR type LIKE '%message' THEN 'message'
    WHEN type LIKE '%updated' THEN 'update'
    ELSE 'general'
  END,
  originator = COALESCE(
    (SELECT name FROM agents WHERE id = activities.agent_id),
    'System'
  )
WHERE event_tag IS NULL OR originator IS NULL;

-- Update create_task_activity function to include event_tag and originator
CREATE OR REPLACE FUNCTION create_task_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activities (type, agent_id, task_id, message, created_at, event_tag, originator)
    VALUES ('task_created', NULL, NEW.id, 'Task "' || NEW.title || '" created', NEW.created_at, 'creation', 'System');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update create_message_activity function to include event_tag and originator
CREATE OR REPLACE FUNCTION create_message_activity()
RETURNS TRIGGER AS $$
DECLARE
    agent_name VARCHAR(255);
BEGIN
    SELECT name INTO agent_name FROM agents WHERE id = NEW.from_agent_id;
    
    -- Only create activity for task-related messages
    IF NEW.task_id IS NOT NULL THEN
        INSERT INTO activities (type, agent_id, task_id, message, created_at, event_tag, originator)
        VALUES ('message_sent', NEW.from_agent_id, NEW.task_id, 
                COALESCE(agent_name, 'Agent') || ' commented on task', NEW.created_at, 'message', COALESCE(agent_name, 'Agent'));
        
        -- Auto-subscribe agent to thread
        INSERT INTO thread_subscriptions (agent_id, task_id, subscribed_at)
        VALUES (NEW.from_agent_id, NEW.task_id, NEW.created_at)
        ON CONFLICT (agent_id, task_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';
