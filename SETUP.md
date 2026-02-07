# Mission Control Setup Guide

## Prerequisites

1. Node.js 18+ installed
2. Convex account and project
3. OpenAI or Anthropic API key

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

Create `.env` file in root:

```bash
# Convex
CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOYMENT=production

# OpenAI (optional, if using OpenAI models)
OPENAI_API_KEY=sk-...

# Anthropic (recommended)
ANTHROPIC_API_KEY=sk-ant-...

# Agent Configuration
AGENT_MODEL=claude-3-5-sonnet-20241022
AGENT_TEMPERATURE=0.7
```

### 3. Initialize Convex

```bash
cd backend
npx convex dev
```

This will:
- Create Convex project (if needed)
- Deploy schema and functions
- Generate TypeScript types

### 4. Create Initial Agents in Database

You'll need to create agent records in Convex. You can do this via the Convex dashboard or create a script:

```typescript
// Create agents
await convex.mutation(api.agents.create, {
  name: "Jarvis",
  role: "Squad Lead",
  sessionKey: "agent:main:main",
  level: "lead"
});

await convex.mutation(api.agents.create, {
  name: "Shuri",
  role: "Product Analyst",
  sessionKey: "agent:product-analyst:main",
  level: "specialist"
});

await convex.mutation(api.agents.create, {
  name: "Friday",
  role: "Developer",
  sessionKey: "agent:developer:main",
  level: "specialist"
});
```

## Running the System

### Development Mode

**Terminal 1: Convex Backend**
```bash
cd backend
npx convex dev
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

**Terminal 5: Standup Generator** (optional, runs on schedule)
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

- **Backend**: Convex functions + LangChain agents
- **Frontend**: Angular dashboard (port 4200)
- **Services**: Background processes for heartbeats, notifications, standups
- **Workspace**: Per-agent directories with memory, SOUL files, configs

## Next Steps

1. Set up Convex project and deploy schema
2. Create agent records in database
3. Configure API keys
4. Start all services
5. Access dashboard at http://localhost:4200
