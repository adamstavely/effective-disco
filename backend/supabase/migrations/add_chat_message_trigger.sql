-- Trigger to create notifications for agents when user sends chat message
-- This triggers when a user message (from_agent_id IS NULL) is inserted into a chat thread

CREATE OR REPLACE FUNCTION notify_agent_on_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  v_thread_agent_id UUID;
  v_thread_tenant_id UUID;
BEGIN
  -- Only process chat messages (not task messages)
  IF NEW.chat_thread_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Only notify if this is a user message (from_agent_id IS NULL)
  IF NEW.from_agent_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get the agent_id and tenant_id from the chat thread
  SELECT agent_id, tenant_id INTO v_thread_agent_id, v_thread_tenant_id
  FROM chat_threads
  WHERE id = NEW.chat_thread_id;
  
  IF v_thread_agent_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Create notification for the thread's agent
  INSERT INTO notifications (
    mentioned_agent_id,
    content,
    task_id,
    delivered,
    created_at,
    tenant_id
  )
  VALUES (
    v_thread_agent_id,
    NEW.content,
    NULL, -- Chat messages don't have task_id
    FALSE,
    NEW.created_at,
    COALESCE(v_thread_tenant_id, NEW.tenant_id)
  )
  ON CONFLICT DO NOTHING; -- Prevent duplicate notifications
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS notify_agent_on_chat_message_trigger ON messages;
CREATE TRIGGER notify_agent_on_chat_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_agent_on_chat_message();
