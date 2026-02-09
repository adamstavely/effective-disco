-- Migration: Create RPC function for chat messages
-- This function creates chat messages with tenant_id support

-- RPC function to create a chat message with mentions and attachments
-- p_from_agent_id can be NULL for user messages, or UUID for agent messages
CREATE OR REPLACE FUNCTION create_chat_message(
  p_chat_thread_id UUID,
  p_content TEXT,
  p_from_agent_id UUID DEFAULT NULL,
  p_mentions UUID[] DEFAULT ARRAY[]::UUID[],
  p_attachments UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_now BIGINT;
  v_tenant_id UUID;
BEGIN
  v_now := EXTRACT(EPOCH FROM NOW()) * 1000;
  
  -- Get tenant_id from chat_threads
  SELECT tenant_id INTO v_tenant_id
  FROM chat_threads
  WHERE id = p_chat_thread_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Chat thread not found or has no tenant_id';
  END IF;
  
  -- Insert message (from_agent_id can be NULL for user messages)
  INSERT INTO messages (chat_thread_id, from_agent_id, content, created_at, tenant_id)
  VALUES (p_chat_thread_id, p_from_agent_id, p_content, v_now, v_tenant_id)
  RETURNING id INTO v_message_id;
  
  -- Insert mentions if provided
  IF array_length(p_mentions, 1) > 0 THEN
    INSERT INTO message_mentions (message_id, agent_id, tenant_id)
    SELECT v_message_id, unnest(p_mentions), v_tenant_id;
    
    -- Create notifications for mentions (no task_id for chat messages)
    INSERT INTO notifications (mentioned_agent_id, content, task_id, delivered, created_at, tenant_id)
    SELECT 
      unnest(p_mentions),
      p_content,
      NULL,
      FALSE,
      v_now,
      v_tenant_id;
  END IF;
  
  -- Insert attachments if provided
  IF array_length(p_attachments, 1) > 0 THEN
    INSERT INTO message_attachments (message_id, document_id, tenant_id)
    SELECT v_message_id, unnest(p_attachments), v_tenant_id;
  END IF;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;
