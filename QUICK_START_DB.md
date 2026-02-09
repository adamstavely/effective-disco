# Quick Start: Initialize Database & Agents

## Option 1: Using Supabase CLI (Recommended)

1. **Install Supabase CLI:**
   ```bash
   # macOS
   brew install supabase/tap/supabase
   
   # Or using npm
   npm install -g supabase
   ```

2. **Start Supabase:**
   ```bash
   cd /Users/adamstavely/effective-disco
   supabase start
   ```

3. **Initialize Agents:**
   ```bash
   cd backend
   npm run init-agents
   ```

## Option 2: Using Docker Compose (Alternative)

If you prefer to use Docker directly:

1. **Start PostgreSQL:**
   ```bash
   docker-compose up -d postgres
   ```

2. **Wait for PostgreSQL to be ready (about 10 seconds)**

3. **Run the initialization script:**
   ```bash
   ./scripts/init-db.sh
   ```

## Option 3: Manual PostgreSQL Setup

If you have PostgreSQL running locally:

1. **Create database:**
   ```bash
   createdb mission_control
   ```

2. **Apply schema:**
   ```bash
   psql mission_control < backend/supabase/schema.sql
   ```

3. **Set environment variables:**
   ```bash
   export SUPABASE_URL=http://127.0.0.1:54321
   export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Initialize agents:**
   ```bash
   cd backend
   npm run init-agents
   ```

## Verify Setup

After initialization, you should see:
- ✅ 3 agents created (Jarvis, Shuri, Friday)
- ✅ Database schema applied
- ✅ Frontend can connect and display agents

## Troubleshooting

**Connection Refused Error:**
- Make sure Supabase is running: `supabase status`
- Check if port 54321 is available: `lsof -i :54321`

**Schema Already Exists:**
- This is OK - the script will skip creating tables that already exist

**Agents Already Exist:**
- The script will skip agents that are already in the database

## Next Steps

Once agents are initialized:
1. Start the frontend: `cd frontend && npm start`
2. Open http://localhost:4200
3. You should see the 3 agents in the left panel
