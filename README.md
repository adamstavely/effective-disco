# Mission Control for AI Agents

A multi-agent coordination system where AI agents work together like a real team, coordinating through shared tasks, comments, and notifications.

## Architecture

- **Backend**: LangChain agents with local PostgreSQL database (via Supabase CLI)
- **Frontend**: Angular dashboard for Mission Control
- **Services**: Heartbeat scheduler, notification daemon, daily standup generator

## Key Features

- **Multi-Tenant Support**: Full tenant isolation with tenant context management
- **Real-Time Chat**: Direct messaging system between agents and users
- **Enhanced Activity Feed**: Rich event tracking with tags, originators, and visual indicators
- **Task Management**: Tags, border colors, resume/play functionality, archiving
- **Kanban Board**: Drag-and-drop task organization
- **Agent Detail Views**: Comprehensive agent profiles with metrics and activity history

## Getting Started

**🚀 Quick Start Database:**
```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Start database
cd /Users/adamstavely/effective-disco
supabase start

# Initialize agents
cd backend && npm run init-agents
```

See [SETUP.md](./SETUP.md) for detailed setup instructions or [START_DATABASE.md](./START_DATABASE.md) for database setup help.

### Quick Start

1. **Install dependencies:**
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ../services/heartbeat && npm install
cd ../notifications && npm install
cd ../standup && npm install
```

2. **Install Supabase CLI:**
```bash
# macOS
brew install supabase/tap/supabase

# Or using npm
npm install -g supabase
```

3. **Start local Supabase:**
```bash
supabase start
# This will start PostgreSQL, API, and real-time services locally
# Schema is automatically applied
```

4. **Set up environment variables (optional for local):**
```bash
cp .env.example .env
# Add your API keys (OpenAI, Anthropic)
# Supabase config is optional - defaults are used for local dev
```

5. **Initialize agents in database:**
```bash
cd backend
npm run init-agents
```

6. **Start development servers:**

Terminal 1 - Local Supabase (if not already running):
```bash
supabase start
```

Terminal 2 - Angular Frontend:
```bash
cd frontend
npm start
# Opens at http://localhost:4200
```

Terminal 3 - Heartbeat Scheduler:
```bash
cd services/heartbeat
npm run dev
```

Terminal 4 - Notification Daemon:
```bash
cd services/notifications
npm run dev
```

## Project Structure

- `backend/` - LangChain agents and Supabase functions
- `backend/supabase/` - Database schema and RPC functions
- `supabase/` - Supabase CLI configuration for local development
- `frontend/` - Angular Mission Control UI
- `workspace/agents/` - Per-agent workspaces (memory, SOUL files, configs)
- `services/` - Background services (heartbeat, notifications, standup)
- `shared/` - Shared TypeScript types

## Local Database

This project uses **local PostgreSQL** via Supabase CLI. All data stays on your machine:
- Database runs in Docker
- API and real-time services run locally
- No cloud dependencies required
- Access Supabase Studio at http://127.0.0.1:54323

See [LOCAL_SETUP.md](./LOCAL_SETUP.md) for detailed setup instructions.

## Agents

- **Jarvis** (Squad Lead) - Coordinator and primary interface
- **Shuri** (Product Analyst) - Testing and UX analysis
- **Friday** (Developer) - Code and technical tasks

## Recent Updates

### Multi-Tenant Support
- Full tenant isolation across all tables
- Tenant context service for managing active tenant
- Tenant selector UI component
- Automatic tenant filtering in all queries

### Chat System
- Direct messaging between agents and users
- Chat threads with real-time updates
- Message mentions and attachments support
- Accessible via top navigation

### Enhanced Activity Feed
- Event tags for categorization (creation, completion, message, etc.)
- Originator tracking (System or agent name)
- Visual color-coded indicators
- Rich event descriptions

### Task Enhancements
- Tag system for task organization
- Border colors for visual distinction
- Last message timestamps
- Resume/play functionality for paused tasks
- Task archiving with toggle visibility

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for detailed feature documentation.
