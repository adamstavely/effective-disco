# Quick Start Guide

## Current Status

✅ Dependencies installed
✅ Angular frontend starting (check http://localhost:4200)
⚠️ Convex backend needs setup
⚠️ Environment variables need API keys

## Next Steps

### 1. Set Up Convex (Required)

Open a new terminal and run:

```bash
cd backend
npx convex dev
```

This will:
- Prompt you to login to Convex (create account if needed)
- Create a new Convex project
- Deploy the schema and functions
- Give you a CONVEX_URL

**Copy the CONVEX_URL** and add it to `.env`:

```bash
# Edit .env file
CONVEX_URL=https://your-project.convex.cloud
```

### 2. Add API Keys (Required for Agents)

Edit `.env` and add your API keys:

```bash
# Anthropic (recommended)
ANTHROPIC_API_KEY=sk-ant-...

# OR OpenAI
OPENAI_API_KEY=sk-...
```

### 3. Initialize Agents in Database

Once Convex is running, in a new terminal:

```bash
cd backend
npm run init-agents
```

This creates the agent records in the database.

### 4. Start Background Services

**Terminal 3 - Heartbeat Scheduler:**
```bash
cd services/heartbeat
npm run dev
```

**Terminal 4 - Notification Daemon:**
```bash
cd services/notifications
npm run dev
```

**Terminal 5 - Standup Generator (optional):**
```bash
cd services/standup
npm run dev
```

## Access the App

- **Frontend**: http://localhost:4200
- **Convex Dashboard**: Check the URL from `npx convex dev`

## Troubleshooting

- **Frontend shows errors**: Make sure Convex is running and CONVEX_URL is set
- **Agents not working**: Check API keys are set in .env
- **No data showing**: Run `npm run init-agents` to create initial agent records
