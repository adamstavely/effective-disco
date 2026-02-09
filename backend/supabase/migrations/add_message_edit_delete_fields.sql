-- Migration: Add fields for message editing and deletion
-- Adds edited_at, deleted_at, and original_content fields to messages table

-- Add new columns to messages table
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS edited_at BIGINT,
  ADD COLUMN IF NOT EXISTS deleted_at BIGINT,
  ADD COLUMN IF NOT EXISTS original_content TEXT;

-- Create index for filtering non-deleted messages
CREATE INDEX IF NOT EXISTS idx_messages_not_deleted ON messages(chat_thread_id, created_at) 
  WHERE deleted_at IS NULL;

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
