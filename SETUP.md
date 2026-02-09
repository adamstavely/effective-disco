# Mission Control Setup Guide

## Prerequisites

1. Node.js 18+ installed
2. Docker (for local PostgreSQL)
3. Supabase CLI (for local API and real-time)
4. OpenAI or Anthropic API key

## Initial Setup

### 1. Install Dependencies

```bash
# Root
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Services
cd ../services/heartbeat
npm install
cd ../notifications
npm install
cd ../standup
npm install
```

### 2. Configure Environment

Create `.env` file in root (optional for local development):

```bash
# Supabase (optional - defaults are used for local development)
# SUPABASE_URL=http://127.0.0.1:54321
# SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...

# OpenAI (optional, if using OpenAI models)
OPENAI_API_KEY=sk-...

# Anthropic (recommended)
ANTHROPIC_API_KEY=sk-ant-...

# Agent Configuration
AGENT_MODEL=claude-3-5-sonnet-20241022
AGENT_TEMPERATURE=0.7
```

**Note**: For local development, you don't need to set Supabase environment variables - the code uses default local values automatically.

### 3. Start Local Supabase

```bash
# Install Supabase CLI (if not already installed)
# macOS: brew install supabase/tap/supabase
# Or: npm install -g supabase

# Start local Supabase (includes PostgreSQL, API, real-time)
supabase start

# This will automatically apply the schema from backend/supabase/schema.sql
```

See [LOCAL_SETUP.md](./LOCAL_SETUP.md) for detailed local setup instructions.

### 4. Create Initial Agents in Database

Run the initialization script:

```bash
cd backend
npm run init-agents
```

This will create Jarvis, Shuri, and Friday agents in the database.

## Running the System

### Development Mode

**Terminal 1: Local Supabase** (if not already running)
```bash
supabase start
```

**Terminal 2: Angular Frontend**
```bash
cd frontend
npm start
```

**Terminal 3: Heartbeat Scheduler**
```bash
cd services/heartbeat
npm run dev
```

**Terminal 4: Notification Daemon**
```bash
cd services/notifications
npm run dev
```

**Terminal 4: Standup Generator** (optional, runs on schedule)
```bash
cd services/standup
npm run dev
```

### Production Mode

Use PM2 or similar process manager:

```bash
pm2 start services/heartbeat/scheduler.ts --name heartbeat
pm2 start services/notifications/daemon.ts --name notifications
pm2 start services/standup/generator.ts --name standup
```

## Testing Agents

You can test agents directly:

```bash
cd backend
npm run build
node dist/index.js jarvis "Check Mission Control for tasks"
```

## Architecture

- **Backend**: Local PostgreSQL (via Supabase CLI) + LangChain agents
- **Frontend**: Angular dashboard (port 4200)
- **Services**: Background processes for heartbeats, notifications, standups
- **Workspace**: Per-agent directories with memory, SOUL files, configs

## Next Steps

1. Install Supabase CLI and start local instance
2. Run schema migration (automatic with `supabase start`)
3. Create agent records in database (run init-agents script)
4. Configure API keys in .env (OpenAI/Anthropic)
5. Start all services
6. Access dashboard at http://localhost:4200
7. Access Supabase Studio at http://127.0.0.1:54323
