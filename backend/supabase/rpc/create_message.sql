-- RPC function to create a message with mentions and attachments
CREATE OR REPLACE FUNCTION create_message(
  p_task_id UUID,
  p_from_agent_id UUID,
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
  
  -- Insert message
  INSERT INTO messages (task_id, from_agent_id, content, created_at)
  VALUES (p_task_id, p_from_agent_id, p_content, v_now)
  RETURNING id INTO v_message_id;
  
  -- Insert mentions if provided
  IF array_length(p_mentions, 1) > 0 THEN
    INSERT INTO message_mentions (message_id, agent_id)
    SELECT v_message_id, unnest(p_mentions);
    
    -- Create notifications for mentions
    INSERT INTO notifications (mentioned_agent_id, content, task_id, delivered, created_at)
    SELECT 
      unnest(p_mentions),
      p_content,
      p_task_id,
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
