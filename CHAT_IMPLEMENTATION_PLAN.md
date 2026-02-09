# Chat Implementation Plan

## Overview
This plan outlines the complete implementation of the agent chat system, fixing existing issues and adding missing functionality for a fully functional chat experience between users and agents.

## Current State Analysis

### ✅ What's Working
- Frontend chat UI component exists (`chat.component.ts`, `chat.component.html`)
- Database schema supports chat (`chat_threads`, `messages` tables)
- RPC function for creating chat messages exists (`create_chat_message.sql`)
- Real-time subscriptions are set up for messages
- Basic message sending/receiving infrastructure

### ❌ Issues Identified

1. **Missing Tenant Filtering**
   - `getChatThreads()` doesn't filter by `tenant_id`
   - `getChatMessages()` doesn't filter by `tenant_id`
   - Could expose threads/messages from other tenants

2. **Missing Agent Response System**
   - No backend service listens for user chat messages
   - Agents don't automatically respond to user messages
   - No integration between chat messages and agent execution

3. **RPC Function Missing tenant_id**
   - `create_chat_message` RPC doesn't include `tenant_id` in message inserts
   - Messages may fail if `tenant_id` is required

4. **Agent Session History**
   - Agents load session history from local files only
   - Chat messages aren't integrated into agent session history
   - Agents can't access chat context when responding

5. **Thread Title Generation**
   - New threads don't get meaningful titles
   - Should auto-generate from first message or agent name

6. **Error Handling**
   - Limited error messages
   - No retry logic for failed operations

## Implementation Plan

### Phase 1: Database & Schema Fixes

#### 1.1 Update RPC Function to Include tenant_id
**File**: `backend/supabase/rpc/create_chat_message.sql`

- Add `tenant_id` parameter or derive from `chat_threads`
- Update INSERT to include `tenant_id` for messages
- Ensure tenant_id is included in message_mentions and message_attachments

#### 1.2 Add Database Trigger for Agent Notifications
**File**: `backend/supabase/migrations/add_chat_message_trigger.sql` (new)

- Create trigger that fires when user message (from_agent_id IS NULL) is inserted
- Create notification for the thread's agent_id
- Mark notification type as 'chat_message'

#### 1.3 Ensure Migration Applied
- Verify `add_tenant_id_to_chat_threads.sql` migration is applied
- Check that all chat-related tables have tenant_id columns

### Phase 2: Backend Service - Chat Message Processor

#### 2.1 Create Chat Message Daemon
**File**: `services/chat/daemon.ts` (new)

**Responsibilities**:
- Poll Supabase for new user chat messages (from_agent_id IS NULL)
- Filter by tenant_id
- Process messages in order (by created_at)
- Trigger agent responses
- Mark messages as processed (optional: add `processed` column)

**Key Features**:
- Poll every 1-2 seconds for new messages
- Load agent instance for the thread's agent_id
- Get chat history from database (not just local files)
- Execute agent with user message
- Save agent response as message with from_agent_id set
- Handle errors gracefully (log, don't crash)

#### 2.2 Create Chat Service Functions
**File**: `backend/supabase/functions/chat.ts` (new)

**Functions**:
- `getUnprocessedChatMessages(tenantId: string)` - Get new user messages
- `getChatHistory(threadId: string)` - Get all messages for context
- `markMessageProcessed(messageId: string)` - Optional: mark as processed

#### 2.3 Update Agent Base Class
**File**: `backend/agents/base/Agent.ts`

**Changes**:
- Add method to load chat history from database
- Add method to save chat message to database
- Integrate chat history into session history
- Support both file-based and database-based history

### Phase 3: Frontend Service Layer Fixes

#### 3.1 Fix Tenant Filtering in SupabaseService
**File**: `frontend/src/app/services/supabase.service.ts`

**Changes**:
- `getChatThreads()`: Add `.eq('tenant_id', tenantId)` filter
- `getChatMessages()`: Add tenant_id filter (via thread lookup or direct filter)
- Ensure all chat queries are tenant-aware

#### 3.2 Improve Error Handling
**File**: `frontend/src/app/services/supabase.service.ts`

**Changes**:
- Better error messages in `createChatThread()`
- Better error messages in `createChatMessage()`
- Add retry logic for transient failures
- Show user-friendly error messages

#### 3.3 Add Loading States
**File**: `frontend/src/app/components/chat/chat.component.ts`

**Changes**:
- Add loading indicators when sending messages
- Disable send button while processing
- Show "Agent is typing..." indicator when waiting for response

### Phase 4: Frontend UI Enhancements

#### 4.1 Auto-Generate Thread Titles
**File**: `frontend/src/app/components/chat/chat.component.ts`

**Changes**:
- When first message is sent, update thread title
- Use first 50 chars of first message or "Chat with {Agent Name}"
- Call `updateChatThreadTitle()` method (needs to be added to service)

#### 4.2 Improve Message Display
**File**: `frontend/src/app/components/chat/chat.component.html`

**Changes**:
- Better visual distinction between user and agent messages
- Show agent avatar/emoji
- Better timestamp formatting
- Markdown rendering improvements
- Code block syntax highlighting

#### 4.3 Add Thread Filtering/Search
**File**: `frontend/src/app/components/chat/chat.component.ts`

**Changes**:
- Filter threads by agent
- Search threads by title/content
- Sort by recent activity

#### 4.4 Add Message Status Indicators
**File**: `frontend/src/app/components/chat/chat.component.html`

**Changes**:
- Show "Sending..." state
- Show "Delivered" checkmark
- Show "Agent typing..." indicator
- Show error state if message fails

### Phase 5: Agent Integration

#### 5.1 Update Agent Session History Loading
**File**: `backend/agents/base/Agent.ts`

**Changes**:
- Load chat history from database when responding to chat messages
- Merge database chat history with local session history
- Maintain conversation context across restarts

#### 5.2 Add Chat-Specific Agent Prompts
**File**: `backend/agents/{agent}/index.ts` (each agent)

**Changes**:
- Add chat-specific system prompts
- Include thread context in prompts
- Make agents aware they're in a chat conversation

#### 5.3 Handle Chat vs Task Context
**File**: `backend/agents/base/Agent.ts`

**Changes**:
- Detect if message is from chat thread vs task
- Use appropriate context and prompts
- Don't create tasks from chat messages (unless explicitly requested)

### Phase 6: Testing & Validation

#### 6.1 Unit Tests
- Test chat message creation
- Test tenant filtering
- Test agent response generation
- Test error handling

#### 6.2 Integration Tests
- Test full chat flow: user message → agent response
- Test multi-tenant isolation
- Test real-time updates
- Test concurrent messages

#### 6.3 Manual Testing Checklist
- [ ] Create new thread with agent
- [ ] Send user message
- [ ] Verify agent responds
- [ ] Verify real-time updates work
- [ ] Verify tenant isolation
- [ ] Verify thread title updates
- [ ] Verify error handling
- [ ] Verify markdown rendering
- [ ] Test with multiple agents
- [ ] Test with multiple tenants

## Implementation Order

### Priority 1 (Critical - Must Fix)
1. ✅ Fix tenant_id in createChatThread (already done)
2. Fix tenant filtering in getChatThreads and getChatMessages
3. Fix RPC function to include tenant_id
4. Create chat message daemon for agent responses

### Priority 2 (Important - Core Functionality)
5. Update agent base class for chat history
6. Add thread title auto-generation
7. Improve error handling and user feedback
8. Add loading states

### Priority 3 (Enhancements - Nice to Have)
9. UI improvements (avatars, better styling)
10. Thread filtering/search
11. Message status indicators
12. Code block syntax highlighting

## Files to Create/Modify

### New Files
- `services/chat/daemon.ts` - Chat message processor daemon
- `backend/supabase/functions/chat.ts` - Chat-related database functions
- `backend/supabase/migrations/add_chat_message_trigger.sql` - Database trigger
- `CHAT_IMPLEMENTATION_PLAN.md` - This file

### Files to Modify
- `backend/supabase/rpc/create_chat_message.sql` - Add tenant_id support
- `frontend/src/app/services/supabase.service.ts` - Fix tenant filtering, add updateChatThreadTitle
- `frontend/src/app/components/chat/chat.component.ts` - Add loading states, title generation
- `frontend/src/app/components/chat/chat.component.html` - UI improvements
- `backend/agents/base/Agent.ts` - Add chat history loading
- `services/index.ts` or main entry point - Start chat daemon

## Database Schema Updates Needed

### Optional: Add processed flag to messages
```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_unprocessed_chat ON messages(processed, chat_thread_id) 
  WHERE processed = FALSE AND chat_thread_id IS NOT NULL AND from_agent_id IS NULL;
```

### Ensure tenant_id exists everywhere
- ✅ chat_threads.tenant_id (migration exists)
- ✅ messages.tenant_id (should already exist from multi-tenant migration)
- Verify message_mentions.tenant_id
- Verify message_attachments.tenant_id

## Success Criteria

1. ✅ Users can create chat threads with agents
2. ✅ Users can send messages to agents
3. ✅ Agents automatically respond to user messages
4. ✅ Real-time updates work (messages appear immediately)
5. ✅ Tenant isolation works correctly
6. ✅ Thread titles are meaningful
7. ✅ Error handling is user-friendly
8. ✅ Chat history persists and loads correctly
9. ✅ Multiple agents can chat simultaneously
10. ✅ UI is responsive and provides good feedback

## Notes

- The chat daemon should be lightweight and not block other services
- Consider rate limiting agent responses to prevent abuse
- Consider adding message editing/deletion features later
- Consider adding file attachments to chat messages
- Consider adding @mentions in chat (different from task mentions)
- Consider adding chat thread archiving/deletion

## Future Enhancements (Out of Scope)

- Chat thread archiving
- Message editing/deletion
- File attachments in chat
- Chat search across all threads
- Chat export functionality
- Voice messages
- Chat thread templates
- Agent availability status
- Typing indicators (real-time)
