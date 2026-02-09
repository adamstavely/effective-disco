-- RPC function to create a task with assignments
CREATE OR REPLACE FUNCTION create_task(
  p_title VARCHAR(500),
  p_description TEXT,
  p_priority VARCHAR(50),
  p_assignee_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS UUID AS $$
DECLARE
  v_task_id UUID;
  v_now BIGINT;
BEGIN
  v_now := EXTRACT(EPOCH FROM NOW()) * 1000;
  
  -- Insert task
  INSERT INTO tasks (title, description, status, priority, created_at, updated_at)
  VALUES (
    p_title,
    p_description,
    CASE WHEN array_length(p_assignee_ids, 1) > 0 THEN 'assigned' ELSE 'inbox' END,
    p_priority,
    v_now,
    v_now
  )
  RETURNING id INTO v_task_id;
  
  -- Create assignments if provided
  IF array_length(p_assignee_ids, 1) > 0 THEN
    INSERT INTO task_assignments (task_id, agent_id)
    SELECT v_task_id, unnest(p_assignee_ids);
  END IF;
  
  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;
