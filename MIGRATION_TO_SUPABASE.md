# Migration from Convex to Supabase

This document outlines the changes made to migrate from Convex to Supabase.

## Overview

The system has been migrated from Convex (a serverless database) to Supabase (PostgreSQL with real-time capabilities). This provides better control, PostgreSQL power, and native real-time subscriptions.

## Key Changes

### 1. Database Schema

- **Location**: `backend/supabase/schema.sql`
- Migrated from Convex schema definitions to PostgreSQL DDL
- Added proper foreign keys, indexes, and constraints
- Implemented triggers for automatic activity creation
- Added RLS (Row Level Security) policies

### 2. Backend Functions

- **Location**: `backend/supabase/functions/`
- Replaced Convex query/mutation functions with Supabase client functions
- Functions organized by domain (agents, tasks, messages, etc.)
- Uses `@supabase/supabase-js` client library

### 3. Frontend Service

- **Replaced**: `ConvexService` → `SupabaseService`
- **Location**: `frontend/src/app/services/supabase.service.ts`
- Uses Supabase real-time subscriptions instead of polling
- Properly typed with Observable streams

### 4. Agent Tools

- **Updated**: `backend/agents/base/Agent.ts`
- All agent tools now use Supabase functions instead of Convex API
- Maintains same functionality with different backend

### 5. Background Services

- **Updated**: `services/heartbeat/scheduler.ts`
- **Updated**: `services/notifications/daemon.ts`
- **Updated**: `services/standup/generator.ts`
- All services now use Supabase client instead of Convex

### 6. Dependencies

**Removed:**
- `convex` package (backend and frontend)

**Added:**
- `@supabase/supabase-js` (backend and frontend)

### 7. Environment Variables

**Removed:**
- `CONVEX_URL`
- `CONVEX_DEPLOYMENT`

**Added:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 8. Initialization

- **Updated**: `backend/scripts/init-agents.ts`
- Now uses Supabase functions instead of Convex mutations

## Migration Steps

1. **Set up Supabase project:**
   - Create project at https://supabase.com
   - Get URL, anon key, and service role key

2. **Run schema migration:**
   ```bash
   # Option 1: Using Supabase SQL Editor
   # Copy contents of backend/supabase/schema.sql and run in SQL Editor
   
   # Option 2: Using psql
   psql -h your-project.supabase.co -U postgres -d postgres -f backend/supabase/schema.sql
   ```

3. **Update environment variables:**
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Install dependencies:**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

5. **Initialize agents:**
   ```bash
   cd backend
   npm run init-agents
   ```

6. **Update frontend config:**
   - Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your build process
   - Or update `frontend/src/index.html` with actual values

## Data Migration

If you have existing data in Convex, you'll need to export it and import into Supabase. The schema structure is similar, but field names have changed:

- `_id` → `id` (UUID)
- `_creationTime` → `created_at` (BIGINT timestamp)
- Snake_case for database columns (e.g., `sessionKey` → `session_key`)

## Benefits of Supabase

1. **PostgreSQL Power**: Full SQL capabilities, complex queries, joins
2. **Real-time**: Native PostgreSQL replication for real-time subscriptions
3. **Open Source**: Self-hostable, no vendor lock-in
4. **Type Safety**: Better TypeScript integration with generated types
5. **Control**: Full database access, custom functions, triggers

## Post-Migration Features

After the initial migration, the following features have been added:

- **Multi-Tenant Support**: Full tenant isolation with `tenant_id` on all tables
- **Chat System**: Real-time messaging via chat threads
- **Enhanced Activities**: Event tags and originator tracking for better event visibility

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for details on these features.

## Notes

- Real-time subscriptions are now native Supabase subscriptions (no polling needed)
- RLS policies are enabled but currently allow all operations (can be restricted later)
- All timestamps are stored as BIGINT (milliseconds since epoch) for consistency
- Multi-tenant support is fully implemented with tenant context management
