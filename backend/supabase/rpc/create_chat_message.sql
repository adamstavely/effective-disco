-- RPC function to create a chat message with mentions and attachments
-- p_from_agent_id can be NULL for user messages, or UUID for agent messages
CREATE OR REPLACE FUNCTION create_chat_message(
  p_chat_thread_id UUID,
  p_from_agent_id UUID DEFAULT NULL,
  p_content TEXT,
  p_mentions UUID[] DEFAULT ARRAY[]::UUID[],
  p_attachments UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_now BIGINT;
BEGIN
  v_now := EXTRACT(EPOCH FROM NOW()) * 1000;
  
  -- Insert message (from_agent_id can be NULL for user messages)
  INSERT INTO messages (chat_thread_id, from_agent_id, content, created_at)
  VALUES (p_chat_thread_id, p_from_agent_id, p_content, v_now)
  RETURNING id INTO v_message_id;
  
  -- Insert mentions if provided
  IF array_length(p_mentions, 1) > 0 THEN
    INSERT INTO message_mentions (message_id, agent_id)
    SELECT v_message_id, unnest(p_mentions);
    
    -- Create notifications for mentions (no task_id for chat messages)
    INSERT INTO notifications (mentioned_agent_id, content, task_id, delivered, created_at)
    SELECT 
      unnest(p_mentions),
      p_content,
      NULL,
      FALSE,
      v_now;
  END IF;
  
  -- Insert attachments if provided
  IF array_length(p_attachments, 1) > 0 THEN
    INSERT INTO message_attachments (message_id, document_id)
    SELECT v_message_id, unnest(p_attachments);
  END IF;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;
