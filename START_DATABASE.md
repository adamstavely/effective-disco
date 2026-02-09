# Start Database - Quick Guide

Since Supabase CLI and Docker aren't available in this environment, please run these commands **manually in your terminal**:

## Option 1: Install Supabase CLI (Recommended - 2 minutes)

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Navigate to project
cd /Users/adamstavely/effective-disco

# Start Supabase (PostgreSQL + API + Real-time)
supabase start

# This will output connection details. Note the API URL and keys.
```

After `supabase start`, you'll see:
- ✅ API URL: http://127.0.0.1:54321
- ✅ DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- ✅ Studio URL: http://127.0.0.1:54323

Then initialize agents:
```bash
cd backend
npm run init-agents
```

## Option 2: Use Docker Compose (If you have Docker)

```bash
# Start PostgreSQL
cd /Users/adamstavely/effective-disco
docker compose up -d postgres

# Wait 10 seconds for PostgreSQL to start

# Apply schema
docker exec -i mission-control-db psql -U postgres -d mission_control < backend/supabase/schema.sql

# Initialize agents
docker exec -i mission-control-db psql -U postgres -d mission_control < init-agents.sql

# Verify
docker exec -i mission-control-db psql -U postgres -d mission_control -c "SELECT name, role FROM agents;"
```

**Note**: With Docker Compose, you'll still need Supabase CLI for the API layer that the frontend requires.

## Option 3: Use Existing PostgreSQL (If you have one)

If you already have PostgreSQL running locally:

```bash
# Apply schema
psql -h 127.0.0.1 -U postgres -d your_database < backend/supabase/schema.sql

# Initialize agents
psql -h 127.0.0.1 -U postgres -d your_database < init-agents.sql

# Set environment variables
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY=your-key-here

# Then you'll still need Supabase CLI for the API
supabase start
```

## Verify Database is Running

After starting, verify agents exist:

**With Supabase CLI:**
```bash
supabase db dump --data-only | grep -A 5 "agents"
```

**With Docker:**
```bash
docker exec -i mission-control-db psql -U postgres -d mission_control -c "SELECT name, role, level FROM agents;"
```

You should see:
- Jarvis (Squad Lead, lead)
- Shuri (Product Analyst, specialist)  
- Friday (Developer, specialist)

## Troubleshooting

**"command not found: supabase"**
- Install it: `brew install supabase/tap/supabase`
- Or use Docker Compose option

**"Port already in use"**
- Stop existing Supabase: `supabase stop`
- Or change ports in `supabase/config.toml`

**"Cannot connect to database"**
- Make sure PostgreSQL is running: `supabase status` or `docker ps`
- Check if port 54322 (Supabase) or 5432 (Docker) is accessible

## Next Steps

Once database is running and agents are initialized:
1. Start frontend: `cd frontend && npm start`
2. Open http://localhost:4200
3. You should see agents in the left panel!
