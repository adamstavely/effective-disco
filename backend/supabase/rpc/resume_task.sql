-- RPC function to resume a task
-- This updates the task status and creates a notification for the assigned agent
CREATE OR REPLACE FUNCTION resume_task(
  p_task_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_task RECORD;
  v_agent_id UUID;
  v_agent_name VARCHAR(255);
  v_now BIGINT;
  v_notification_content TEXT;
BEGIN
  v_now := EXTRACT(EPOCH FROM NOW()) * 1000;
  
  -- Get task details with first assignee
  SELECT t.*, ta.agent_id
  INTO v_task
  FROM tasks t
  LEFT JOIN task_assignments ta ON ta.task_id = t.id
  WHERE t.id = p_task_id
  ORDER BY ta.agent_id
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  
  -- Get the first assignee agent
  SELECT agent_id INTO v_agent_id
  FROM task_assignments
  WHERE task_id = p_task_id
  LIMIT 1;
  
  IF v_agent_id IS NULL THEN
    RAISE EXCEPTION 'Task has no assignees';
  END IF;
  
  -- Get agent name
  SELECT name INTO v_agent_name
  FROM agents
  WHERE id = v_agent_id;
  
  -- Build notification content
  v_notification_content := format(
    'RESUME TASK: %s%n%nTask: %s%nDescription: %s%n%nPlease resume work on this task. Review the conversation thread and continue from where you left off.',
    v_task.title,
    v_task.title,
    COALESCE(v_task.description, 'No description')
  );
  
  -- Create notification for the agent
  INSERT INTO notifications (mentioned_agent_id, content, task_id, delivered, created_at)
  VALUES (v_agent_id, v_notification_content, p_task_id, false, v_now);
  
  -- Update task status to "in_progress"
  UPDATE tasks
  SET status = 'in_progress',
      updated_at = v_now
  WHERE id = p_task_id;
  
  -- Create activity
  INSERT INTO activities (type, agent_id, task_id, message, created_at, event_tag, originator)
  VALUES (
    'status_changed',
    v_agent_id,
    p_task_id,
    format('Task "%s" resumed - agent %s notified to continue work', v_task.title, COALESCE(v_agent_name, 'Unknown')),
    v_now,
    'update',
    COALESCE(v_agent_name, 'System')
  );
  
  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'agent_id', v_agent_id,
    'agent_name', v_agent_name,
    'task_id', p_task_id
  );
END;
$$ LANGUAGE plpgsql;
