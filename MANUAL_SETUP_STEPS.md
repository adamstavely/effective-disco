# Manual Setup Steps - Run These Commands

Since Docker isn't available in this environment, please run these commands manually in your terminal:

## Step 1: Start PostgreSQL with Docker Compose

```bash
cd /Users/adamstavely/effective-disco
docker compose up -d postgres
# OR if you have older Docker: docker-compose up -d postgres
```

Wait about 10 seconds for PostgreSQL to start.

## Step 2: Apply Database Schema

```bash
docker exec -i mission-control-db psql -U postgres -d mission_control < backend/supabase/schema.sql
```

## Step 3: Initialize Agents

**Option A: Using SQL file**
```bash
docker exec -i mission-control-db psql -U postgres -d mission_control < init-agents.sql
```

**Option B: Using the Node script**
```bash
cd backend
DB_HOST=127.0.0.1 DB_PORT=5432 DB_NAME=mission_control DB_USER=postgres DB_PASSWORD=postgres npm run init-agents-direct
```

**Option C: Direct SQL command**
```bash
docker exec -i mission-control-db psql -U postgres -d mission_control <<EOF
INSERT INTO agents (name, role, session_key, level, status, last_heartbeat)
VALUES 
  ('Jarvis', 'Squad Lead', 'agent:main:main', 'lead', 'idle', EXTRACT(EPOCH FROM NOW()) * 1000),
  ('Shuri', 'Product Analyst', 'agent:product-analyst:main', 'specialist', 'idle', EXTRACT(EPOCH FROM NOW()) * 1000),
  ('Friday', 'Developer', 'agent:developer:main', 'specialist', 'idle', EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (session_key) DO NOTHING;
EOF
```

## Step 4: Verify Setup

```bash
docker exec -i mission-control-db psql -U postgres -d mission_control -c "SELECT name, role, level, status FROM agents ORDER BY name;"
```

You should see:
```
  name   |      role       |    level    | status 
---------+-----------------+-------------+--------
 Friday  | Developer       | specialist  | idle
 Jarvis  | Squad Lead      | lead        | idle
 Shuri   | Product Analyst | specialist  | idle
```

## Step 5: Start Supabase CLI (for Frontend)

The frontend needs the Supabase API server, not just PostgreSQL:

```bash
# Install if needed
brew install supabase/tap/supabase

# Start Supabase (this will connect to your Docker PostgreSQL)
supabase start
```

**Note**: Supabase CLI will try to use its own PostgreSQL. To make it use your Docker PostgreSQL, you may need to configure it or use the Supabase CLI's PostgreSQL instead.

## Alternative: Use Supabase CLI for Everything

If you prefer, you can skip Docker and use Supabase CLI for both PostgreSQL and API:

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Start Supabase (includes PostgreSQL + API)
cd /Users/adamstavely/effective-disco
supabase start

# Apply schema
supabase db reset  # This applies schema.sql automatically

# Initialize agents
cd backend
npm run init-agents
```

This is actually simpler and recommended!

## Next Steps

Once agents are initialized:
1. Start the frontend: `cd frontend && npm start`
2. Open http://localhost:4200
3. You should see the 3 agents in the left panel
