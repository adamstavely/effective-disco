# Mission Control for AI Agents

A multi-agent coordination system where AI agents work together like a real team, coordinating through shared tasks, comments, and notifications.

## Architecture

- **Backend**: LangChain agents with Convex database
- **Frontend**: Angular dashboard for Mission Control
- **Services**: Heartbeat scheduler, notification daemon, daily standup generator

## Getting Started

See [SETUP.md](./SETUP.md) for detailed setup instructions.

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

2. **Set up environment variables:**
```bash
cp .env.example .env
# Add your API keys (OpenAI, Anthropic, Convex URL)
```

3. **Initialize Convex:**
```bash
cd backend
npx convex dev
# This will create a Convex project and deploy the schema
```

4. **Initialize agents in database:**
```bash
cd backend
npm run init-agents
```

5. **Start development servers:**

Terminal 1 - Convex:
```bash
cd backend
npx convex dev
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

- `backend/` - LangChain agents and Convex functions
- `frontend/` - Angular Mission Control UI
- `workspace/agents/` - Per-agent workspaces (memory, SOUL files, configs)
- `services/` - Background services (heartbeat, notifications, standup)
- `shared/` - Shared TypeScript types

## Agents

- **Jarvis** (Squad Lead) - Coordinator and primary interface
- **Shuri** (Product Analyst) - Testing and UX analysis
- **Friday** (Developer) - Code and technical tasks
