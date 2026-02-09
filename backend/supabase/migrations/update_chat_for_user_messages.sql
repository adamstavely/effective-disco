-- Migration: Update chat system to support user-to-agent messaging
-- Users chat WITH agents, not AS agents

-- Step 1: Make from_agent_id nullable in messages (NULL = user message, UUID = agent message)
ALTER TABLE messages 
  ALTER COLUMN from_agent_id DROP NOT NULL;

-- Step 2: Add agent_id to chat_threads (the agent the user is chatting with)
ALTER TABLE chat_threads 
  ADD COLUMN agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;

-- Step 3: Migrate existing data - set agent_id = created_by for existing threads
UPDATE chat_threads 
  SET agent_id = created_by 
  WHERE agent_id IS NULL;

-- Step 4: Make agent_id NOT NULL after migration
ALTER TABLE chat_threads 
  ALTER COLUMN agent_id SET NOT NULL;

-- Step 5: Add index for agent_id lookups
CREATE INDEX IF NOT EXISTS idx_chat_threads_agent ON chat_threads(agent_id);

-- Step 6: Update the constraint to allow NULL from_agent_id for chat messages
-- (Task messages still require from_agent_id, but chat messages can be from users)
-- The existing CHECK constraint already allows this since it only checks task_id OR chat_thread_id
