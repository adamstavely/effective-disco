-- RPC function to update a chat message
CREATE OR REPLACE FUNCTION update_chat_message(
  p_message_id UUID,
  p_new_content TEXT,
  p_tenant_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_now BIGINT;
  v_current_content TEXT;
  v_message_tenant_id UUID;
BEGIN
  v_now := EXTRACT(EPOCH FROM NOW()) * 1000;
  
  -- Get current message and tenant_id
  SELECT content, tenant_id INTO v_current_content, v_message_tenant_id
  FROM messages
  WHERE id = p_message_id;
  
  IF v_current_content IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;
  
  -- Verify tenant_id matches
  IF v_message_tenant_id != p_tenant_id THEN
    RAISE EXCEPTION 'Message does not belong to this tenant';
  END IF;
  
  -- Check if message is deleted
  IF EXISTS (SELECT 1 FROM messages WHERE id = p_message_id AND deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Cannot edit a deleted message';
  END IF;
  
  -- Update message: store original content if first edit, update content and edited_at
  UPDATE messages
  SET 
    content = p_new_content,
    edited_at = v_now,
    original_content = COALESCE(original_content, v_current_content)
  WHERE id = p_message_id
    AND tenant_id = p_tenant_id
  RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;
