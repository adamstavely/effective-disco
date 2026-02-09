-- Migration: Add Execution Tracking System
-- Adds execution state tracking and step logging capabilities for human-in-the-loop

-- Add execution tracking fields to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS execution_state VARCHAR(50) DEFAULT 'idle' CHECK (execution_state IN ('idle', 'running', 'paused', 'waiting_input', 'completed')),
ADD COLUMN IF NOT EXISTS execution_paused_at BIGINT,
ADD COLUMN IF NOT EXISTS execution_resumed_at BIGINT,
ADD COLUMN IF NOT EXISTS current_step_id UUID REFERENCES activities(id) ON DELETE SET NULL;

-- Add execution step fields to activities table
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS step_details JSONB,
ADD COLUMN IF NOT EXISTS step_status VARCHAR(50) CHECK (step_status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
ADD COLUMN IF NOT EXISTS step_order INTEGER;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_activities_task_step_order ON activities(task_id, step_order) WHERE task_id IS NOT NULL AND step_order IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_step_status ON activities(step_status) WHERE step_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_execution_state ON tasks(execution_state);

-- Update existing tasks to have default execution_state
UPDATE tasks SET execution_state = 'idle' WHERE execution_state IS NULL;

-- Function to get next step order for a task
CREATE OR REPLACE FUNCTION get_next_step_order(p_task_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_max_order INTEGER;
BEGIN
  SELECT COALESCE(MAX(step_order), 0) INTO v_max_order
  FROM activities
  WHERE task_id = p_task_id AND step_order IS NOT NULL;
  
  RETURN v_max_order + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to update task execution state
CREATE OR REPLACE FUNCTION update_task_execution_state(
  p_task_id UUID,
  p_execution_state VARCHAR(50),
  p_current_step_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_now BIGINT;
BEGIN
  v_now := EXTRACT(EPOCH FROM NOW()) * 1000;
  
  UPDATE tasks
  SET 
    execution_state = p_execution_state,
    current_step_id = COALESCE(p_current_step_id, current_step_id),
    execution_paused_at = CASE WHEN p_execution_state = 'paused' THEN v_now ELSE execution_paused_at END,
    execution_resumed_at = CASE WHEN p_execution_state = 'running' AND execution_state = 'paused' THEN v_now ELSE execution_resumed_at END,
    updated_at = v_now
  WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql;
