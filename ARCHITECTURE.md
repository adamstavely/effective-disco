# Mission Control Architecture

## System Overview

Mission Control is a multi-agent coordination system where AI agents work together like a real team. Each agent has its own workspace, personality, and memory, while coordinating through a shared Mission Control database.

## Components

### 1. Backend (Supabase + LangChain)

**Supabase Database** (`backend/supabase/`):
- `schema.sql` - PostgreSQL schema definition with:
  - Multi-tenant support (tenant_id on all tables)
  - Row Level Security (RLS) policies
  - Triggers for automatic activity creation
  - Real-time subscriptions support
- `functions/` - TypeScript functions for database operations:
  - `agents.ts` - Agent CRUD operations
  - `tasks.ts` - Task management with resume/play
  - `messages.ts` - Comment/message system
  - `documents.ts` - Document storage
  - `activities.ts` - Enhanced activity feed with event tags
  - `notifications.ts` - Notification system
  - `proposals.ts` - Proposal management
  - `chat.ts` - Chat messaging system
- `rpc/` - PostgreSQL RPC functions:
  - `create_chat_message.sql` - Chat message creation with mentions
  - `resume_task.sql` - Task resume functionality

**LangChain Agents** (`backend/agents/`):
- `base/Agent.ts` - Base agent class with:
  - Session persistence (JSONL files)
  - Memory management (WORKING.md, daily notes)
  - Tool access (Supabase API, file system, memory)
  - LLM integration (OpenAI/Anthropic)
- `jarvis/`, `shuri/`, `friday/` - Agent instances

### 2. Frontend (Angular)

**Dashboard** (`frontend/src/app/dashboard/`):
- Three-panel layout matching the reference mockup
- Real-time updates via Supabase subscriptions
- Multi-tenant context management

**Components**:
- `top-nav/` - Navigation bar with global stats, tenant selector, and chat access
- `agents-panel/` - Left panel with agent list and detail tray
- `mission-queue/` - Center Kanban board with drag-and-drop
- `live-feed/` - Right panel enhanced activity feed
- `chat/` - Real-time chat interface for agent-user communication
- `tenant-selector/` - Tenant switching dropdown
- `task-detail-panel/` - Side panel for task details, tags, and comments
- `agent-detail-tray/` - Slide-out tray for agent profiles and metrics
- Supporting components (task-card, agent-card, activity-item, etc.)

**Services**:
- `supabase.service.ts` - Supabase client wrapper with RxJS Observables
- `tenant-context.service.ts` - Tenant context management with localStorage persistence

### 3. Services

**Heartbeat Scheduler** (`services/heartbeat/`):
- Staggered cron jobs (every hour, offset by agent)
- Wakes agents, checks for work, executes tasks
- Updates agent status in Supabase
- Tenant-aware task filtering

**Notification Daemon** (`services/notifications/`):
- Polls Supabase every 2 seconds for undelivered notifications
- Delivers messages to agent sessions
- Marks notifications as delivered
- Supports tenant filtering

**Standup Generator** (`services/standup/`):
- Daily cron job (11:30 PM IST)
- Compiles agent activity and task status
- Generates markdown report

### 4. Workspace (Per-Agent)

Each agent has its own workspace directory:
```
workspace/agents/{agent-name}/
├── SOUL.md              # Personality definition
├── AGENTS.md            # Operating manual
├── memory/
│   ├── WORKING.md       # Current task state
│   ├── MEMORY.md        # Long-term memory
│   └── YYYY-MM-DD.md    # Daily notes
├── scripts/             # Utilities
├── config/              # Credentials/settings
└── sessions/            # Conversation history (JSONL)
```

## Data Flow

### Task Lifecycle

1. **Task Created** → Stored in Supabase `tasks` table with tenant_id
2. **Task Assigned** → Agent notified via notifications
3. **Agent Wakes** → Heartbeat checks assigned tasks (tenant-filtered)
4. **Agent Works** → Updates WORKING.md, posts messages
5. **Task Completed** → Status updated to "review" or "done"
6. **Activity Logged** → Entry added to `activities` table with event_tag and originator
7. **Task Resume** → Can resume paused tasks via resume functionality

### Agent Communication

1. **@Mention** → Notification created in `notifications` table
2. **Notification Daemon** → Polls and delivers to agent session
3. **Agent Responds** → Posts message to task thread or chat thread
4. **Thread Subscription** → Auto-subscribes agents to threads
5. **Activity Feed** → All actions logged in real-time with event tags and originators
6. **Chat System** → Direct messaging via chat threads (separate from task threads)

### Memory System

- **WORKING.md**: Updated constantly during work
- **Daily Notes**: Append-only log of activities
- **MEMORY.md**: Curated important information
- **Session History**: JSONL files with conversation context

## Agent Tools

Each agent has access to:

1. **Memory Tools**:
   - `read_working_memory()` - Get current task state
   - `update_working_memory()` - Update WORKING.md
   - `append_daily_note()` - Add to daily notes

2. **Supabase Tools**:
   - `get_assigned_tasks()` - Get tasks assigned to agent (tenant-filtered)
   - `get_task_details()` - Get task information
   - `post_message()` - Post comment to task thread or chat thread
   - `update_task_status()` - Update task status
   - `create_document()` - Create deliverable document
   - `check_notifications()` - Get undelivered notifications
   - `resume_task()` - Resume a paused task
   - `create_chat_message()` - Send chat message

3. **File System Tools**:
   - `read_file()` - Read workspace files
   - `write_file()` - Write workspace files

## Multi-Tenant Architecture

The system supports full multi-tenancy:

- **Tenant Isolation**: All tables include `tenant_id` column
- **Tenant Context**: `TenantContextService` manages active tenant
- **Tenant Management**: `tenants`, `tenant_settings`, `api_tokens`, `rate_limits` tables
- **RLS Policies**: Row-level security policies filter by tenant (currently permissive, can be restricted)
- **Default Tenant**: Existing data migrated to default tenant (UUID: `00000000-0000-0000-0000-000000000000`)

## Enhanced Features

### Activity Feed
- **Event Tags**: Categorization (creation, completion, message, update, failure, general)
- **Originator Tracking**: Shows "System" or agent name
- **Visual Indicators**: Color-coded bullets based on event type
- **Rich Descriptions**: Detailed event messages with context

### Chat System
- **Chat Threads**: Separate from task threads for direct communication
- **Real-Time Updates**: Supabase real-time subscriptions
- **Mentions & Attachments**: Full support for @mentions and document attachments
- **Agent Selection**: Choose sender agent for messages

### Task Management
- **Tags**: Array-based tag system for organization
- **Border Colors**: Visual distinction via hex color codes
- **Last Message Timestamps**: Track recent activity
- **Resume/Play**: Resume paused tasks with full context
- **Archiving**: Archive tasks with toggle visibility

## Deployment

### Development
- Supabase: `supabase start` (runs PostgreSQL locally in Docker)
- Angular: `npm start` (dev server with hot reload)
- Services: Run each in separate terminal

### Production
- Supabase: Deploy to Supabase Cloud or self-hosted PostgreSQL
- Angular: Build and serve static files
- Services: Run via PM2 or systemd

## Scaling

To add more agents:

1. Create agent workspace: `workspace/agents/{name}/`
2. Add SOUL.md and AGENTS.md
3. Create agent instance in `backend/agents/{name}/index.ts`
4. Add to heartbeat scheduler
5. Create agent record in Supabase database (via `npm run init-agents`)

To add more tenants:

1. Create tenant record in `tenants` table
2. Set tenant context via `TenantContextService`
3. All queries automatically filter by tenant_id
4. Configure tenant-specific settings in `tenant_settings` table
