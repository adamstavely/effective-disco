-- RPC function to delete a chat message (soft delete)
CREATE OR REPLACE FUNCTION delete_chat_message(
  p_message_id UUID,
  p_tenant_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_now BIGINT;
BEGIN
  v_now := EXTRACT(EPOCH FROM NOW()) * 1000;
  
  -- Soft delete: set deleted_at timestamp
  UPDATE messages
  SET deleted_at = v_now
  WHERE id = p_message_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL -- Prevent double deletion
  RETURNING id INTO v_message_id;
  
  IF v_message_id IS NULL THEN
    RAISE EXCEPTION 'Message not found, already deleted, or does not belong to this tenant';
  END IF;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;
