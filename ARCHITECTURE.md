# Mission Control Architecture

## System Overview

Mission Control is a multi-agent coordination system where AI agents work together like a real team. Each agent has its own workspace, personality, and memory, while coordinating through a shared Mission Control database.

## Components

### 1. Backend (Convex + LangChain)

**Convex Database** (`backend/convex/`):
- `schema.ts` - Database schema definition
- `agents.ts` - Agent CRUD operations
- `tasks.ts` - Task management
- `messages.ts` - Comment/message system
- `documents.ts` - Document storage
- `activities.ts` - Activity feed
- `notifications.ts` - Notification system
- `thread_subscriptions.ts` - Thread subscription management

**LangChain Agents** (`backend/agents/`):
- `base/Agent.ts` - Base agent class with:
  - Session persistence (JSONL files)
  - Memory management (WORKING.md, daily notes)
  - Tool access (Convex API, file system, memory)
  - LLM integration (OpenAI/Anthropic)
- `jarvis/`, `shuri/`, `friday/` - Agent instances

### 2. Frontend (Angular)

**Dashboard** (`frontend/src/app/dashboard/`):
- Three-panel layout matching the reference mockup
- Real-time updates via Convex subscriptions

**Components**:
- `top-nav/` - Navigation bar with global stats
- `agents-panel/` - Left panel with agent list
- `mission-queue/` - Center Kanban board
- `live-feed/` - Right panel activity feed
- Supporting components (task-card, agent-card, etc.)

**Services**:
- `convex.service.ts` - Convex client wrapper with RxJS Observables

### 3. Services

**Heartbeat Scheduler** (`services/heartbeat/`):
- Staggered cron jobs (every hour, offset by agent)
- Wakes agents, checks for work, executes tasks
- Updates agent status in Convex

**Notification Daemon** (`services/notifications/`):
- Polls Convex every 2 seconds for undelivered notifications
- Delivers messages to agent sessions
- Marks notifications as delivered

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

1. **Task Created** → Stored in Convex `tasks` table
2. **Task Assigned** → Agent notified via notifications
3. **Agent Wakes** → Heartbeat checks assigned tasks
4. **Agent Works** → Updates WORKING.md, posts messages
5. **Task Completed** → Status updated to "review" or "done"
6. **Activity Logged** → Entry added to `activities` table

### Agent Communication

1. **@Mention** → Notification created in `notifications` table
2. **Notification Daemon** → Polls and delivers to agent session
3. **Agent Responds** → Posts message to task thread
4. **Thread Subscription** → Auto-subscribes agents to threads
5. **Activity Feed** → All actions logged in real-time

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

2. **Convex Tools**:
   - `get_assigned_tasks()` - Get tasks assigned to agent
   - `get_task_details()` - Get task information
   - `post_message()` - Post comment to task thread
   - `update_task_status()` - Update task status
   - `create_document()` - Create deliverable document
   - `check_notifications()` - Get undelivered notifications

3. **File System Tools**:
   - `read_file()` - Read workspace files
   - `write_file()` - Write workspace files

## Deployment

### Development
- Convex: `npx convex dev` (runs locally with sync)
- Angular: `npm start` (dev server with hot reload)
- Services: Run each in separate terminal

### Production
- Convex: Deploy to Convex cloud
- Angular: Build and serve static files
- Services: Run via PM2 or systemd

## Scaling

To add more agents:

1. Create agent workspace: `workspace/agents/{name}/`
2. Add SOUL.md and AGENTS.md
3. Create agent instance in `backend/agents/{name}/index.ts`
4. Add to heartbeat scheduler
5. Create agent record in Convex database
