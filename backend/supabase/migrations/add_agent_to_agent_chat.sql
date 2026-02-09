-- Migration: Add support for agent-to-agent chat threads
-- This extends chat_threads to support both user-to-agent and agent-to-agent conversations

-- Step 1: Add participant_agent_ids array column for agent-to-agent threads
ALTER TABLE chat_threads 
  ADD COLUMN IF NOT EXISTS participant_agent_ids UUID[] DEFAULT NULL;

-- Step 2: Make agent_id nullable to support agent-to-agent threads
-- (For user-to-agent threads, agent_id will still be set. For agent-to-agent, it can be NULL)
ALTER TABLE chat_threads 
  ALTER COLUMN agent_id DROP NOT NULL;

-- Step 3: Add check constraint to ensure either agent_id or participant_agent_ids is set
ALTER TABLE chat_threads 
  ADD CONSTRAINT check_thread_type 
  CHECK (
    (agent_id IS NOT NULL) OR 
    (participant_agent_ids IS NOT NULL AND array_length(participant_agent_ids, 1) >= 2)
  );

-- Step 4: Create index for participant_agent_ids lookups (using GIN index for array searches)
CREATE INDEX IF NOT EXISTS idx_chat_threads_participants 
  ON chat_threads USING GIN (participant_agent_ids);

-- Step 5: Add comment to document the new field
COMMENT ON COLUMN chat_threads.participant_agent_ids IS 
  'Array of agent IDs participating in agent-to-agent chat threads. NULL for user-to-agent threads.';
