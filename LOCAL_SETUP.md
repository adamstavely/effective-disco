# Local Database Setup Guide

This project uses **local PostgreSQL** via Supabase CLI for development. All data stays on your machine.

## Prerequisites

1. **Docker** (for PostgreSQL) - [Install Docker](https://www.docker.com/get-started)
2. **Supabase CLI** (for local API and real-time) - [Install Supabase CLI](https://supabase.com/docs/guides/cli)

## Quick Start

### 1. Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Or using npm
npm install -g supabase

# Verify installation
supabase --version
```

### 2. Start Local Supabase

```bash
# Start Supabase (includes PostgreSQL, API, real-time, and Studio)
supabase start

# This will output:
# - API URL: http://127.0.0.1:54321
# - DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
# - Studio URL: http://127.0.0.1:54323
# - anon key: (default local key)
# - service_role key: (default local key)
```

### 3. Run Database Schema

The schema will be automatically applied when you start Supabase, or you can run it manually:

```bash
# Using Supabase CLI
supabase db reset

# Or manually via psql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f backend/supabase/schema.sql
```

### 4. Initialize Agents

```bash
cd backend
npm run init-agents
```

### 5. Start Development Servers

**Terminal 1 - Frontend:**
```bash
cd frontend
npm start
# Opens at http://localhost:4200
```

**Terminal 2 - Heartbeat Scheduler:**
```bash
cd services/heartbeat
npm run dev
```

**Terminal 3 - Notification Daemon:**
```bash
cd services/notifications
npm run dev
```

## Configuration

### Default Local Settings

The code uses these defaults for local development:
- **API URL**: `http://127.0.0.1:54321`
- **Database**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Anon Key**: Default local key (hardcoded in code)
- **Service Role Key**: Default local key (hardcoded in code)

You don't need to set environment variables for local development - everything works out of the box!

### Optional: Custom Configuration

If you want to override defaults, create a `.env` file:

```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Accessing the Database

### Supabase Studio (Web UI)

Open http://127.0.0.1:54323 in your browser to access:
- Database tables and data
- SQL editor
- API documentation
- Authentication settings

### Direct PostgreSQL Access

```bash
# Using psql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Or using connection string from Supabase
supabase status
# Look for "DB URL" in the output
```

### Using Database GUI Tools

Connect with these credentials:
- **Host**: `127.0.0.1`
- **Port**: `54322`
- **Database**: `postgres`
- **Username**: `postgres`
- **Password**: `postgres`

## Stopping Local Supabase

```bash
# Stop all services
supabase stop

# Stop and remove all data
supabase stop --no-backup
```

## Troubleshooting

### Port Already in Use

If ports 54321-54329 are already in use:

1. Check what's using them:
```bash
lsof -i :54321
```

2. Stop conflicting services or change ports in `supabase/config.toml`

### Database Connection Errors

1. Make sure Supabase is running:
```bash
supabase status
```

2. Restart Supabase:
```bash
supabase stop
supabase start
```

### Schema Not Applied

Run the schema manually:
```bash
supabase db reset
```

## Data Persistence

Data is stored in Docker volumes. To persist data:
- Data survives `supabase stop` (default)
- Data is removed with `supabase stop --no-backup`

To backup data:
```bash
# Export database
supabase db dump -f backup.sql

# Restore database
supabase db reset
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < backup.sql
```

## Production Deployment

For production, you can:
1. Use Supabase Cloud (hosted)
2. Self-host Supabase on your own server
3. Use any PostgreSQL database + implement your own API layer

The code supports both local and production configurations via environment variables.
