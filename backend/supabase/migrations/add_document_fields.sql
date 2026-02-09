-- Migration: Add path and message_id fields to documents table
-- Phase 2.3: Document Preview Tray System

-- Add path column
ALTER TABLE documents ADD COLUMN IF NOT EXISTS path VARCHAR(500);

-- Add message_id column with foreign key
ALTER TABLE documents ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Add index for message_id
CREATE INDEX IF NOT EXISTS idx_documents_message ON documents(message_id);
