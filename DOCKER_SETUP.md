# Docker Compose Database Setup

This guide will help you set up the Mission Control database using Docker Compose.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (usually included with Docker Desktop)

## Quick Setup

Run the setup script:

```bash
./setup-docker-db.sh
```

This script will:
1. Start PostgreSQL container
2. Wait for it to be ready
3. Apply the database schema
4. Initialize the 3 agents (Jarvis, Shuri, Friday)

## Manual Setup

If you prefer to do it step by step:

### 1. Start PostgreSQL

```bash
docker-compose up -d postgres
```

### 2. Wait for PostgreSQL to be ready

```bash
# Check status
docker ps --filter "name=mission-control-db"

# Wait until you see "healthy" status
```

### 3. Apply Database Schema

```bash
docker exec -i mission-control-db psql -U postgres -d mission_control < backend/supabase/schema.sql
```

### 4. Initialize Agents

```bash
cd backend
DB_HOST=127.0.0.1 DB_PORT=5432 DB_NAME=mission_control DB_USER=postgres DB_PASSWORD=postgres npm run init-agents-direct
```

Or use SQL directly:

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

## Verify Setup

Check that agents were created:

```bash
docker exec -i mission-control-db psql -U postgres -d mission_control -c "SELECT name, role, level FROM agents;"
```

You should see:
```
  name   |      role       |    level    
---------+-----------------+-------------
 Jarvis  | Squad Lead      | lead
 Shuri   | Product Analyst | specialist
 Friday  | Developer       | specialist
```

## Important Notes

⚠️ **Frontend Connection**: The frontend currently expects Supabase API at `http://127.0.0.1:54321`. Since Docker Compose only provides PostgreSQL (not the full Supabase stack), you have two options:

### Option A: Use Supabase CLI (Recommended)
Install and start Supabase CLI which provides the API layer:
```bash
brew install supabase/tap/supabase
supabase start
```

### Option B: Update Frontend to Connect Directly
Modify the frontend to use a PostgreSQL client library instead of Supabase client. This requires more changes.

## Database Connection Details

- **Host**: 127.0.0.1
- **Port**: 5432
- **Database**: mission_control
- **Username**: postgres
- **Password**: postgres

## Useful Commands

```bash
# View database logs
docker-compose logs -f postgres

# Stop database
docker-compose down

# Stop and remove data
docker-compose down -v

# Access PostgreSQL shell
docker exec -it mission-control-db psql -U postgres -d mission_control

# Backup database
docker exec mission-control-db pg_dump -U postgres mission_control > backup.sql

# Restore database
docker exec -i mission-control-db psql -U postgres -d mission_control < backup.sql
```

## Troubleshooting

**Port 5432 already in use:**
- Change the port in `docker-compose.yml` (e.g., `"5433:5432"`)
- Update connection strings accordingly

**Container won't start:**
- Check Docker Desktop is running
- Check logs: `docker-compose logs postgres`

**Schema errors:**
- The schema may already be applied (this is OK)
- Check existing tables: `docker exec -i mission-control-db psql -U postgres -d mission_control -c "\dt"`
