# Seed Test Data

This guide explains how to populate your Mission Control database with comprehensive test data to verify all features are working correctly.

## What Test Data is Created

The seed script creates realistic test data including:

- **8 Tasks** with various statuses (inbox, assigned, in_progress, review, done, blocked, archived)
- **10 Task Assignments** linking agents to tasks
- **5 Task Messages** (comments on tasks)
- **4 Chat Messages** (direct chat between user and agents)
- **3 Documents** (deliverables, research, protocols)
- **3 Proposals** (pending, approved, rejected)
- **6 Cost Records** (LLM API usage and tool usage)
- **1 Budget Record** (daily and monthly limits)
- **7 Thread Subscriptions** (agents subscribed to task threads)
- **2 Notifications** (mentions and thread updates)
- **8 Additional Activities** (step completions, status changes)

## Prerequisites

Before running the seed script, ensure:

1. ✅ Database schema is applied (`backend/supabase/schema.sql`)
2. ✅ Agents are initialized (Jarvis, Shuri, Friday)
3. ✅ Multi-tenant migration is applied (if using multi-tenant support)

## Running the Seed Script

### Option 1: Using Docker Compose

If you're using Docker Compose for PostgreSQL:

```bash
# Make sure PostgreSQL is running
docker compose up -d postgres

# Wait a few seconds for PostgreSQL to be ready, then run:
docker exec -i mission-control-db psql -U postgres -d mission_control < seed-test-data.sql
```

### Option 2: Using Supabase CLI

If you're using Supabase CLI:

```bash
# Make sure Supabase is running
supabase status

# Run the seed script
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f seed-test-data.sql
```

### Option 3: Direct PostgreSQL Connection

If you have direct PostgreSQL access:

```bash
psql -h 127.0.0.1 -U postgres -d mission_control -f seed-test-data.sql
```

## Verify Test Data

After running the script, you should see output showing:

```
NOTICE:  Test data created successfully!
NOTICE:  Created:
NOTICE:    - 8 tasks (various statuses)
NOTICE:    - 10 task assignments
NOTICE:    - 5 task messages
NOTICE:    - 4 chat messages
NOTICE:    - 3 documents
NOTICE:    - 3 proposals
NOTICE:    - 6 cost records
NOTICE:    - 1 budget record
NOTICE:    - 7 thread subscriptions
NOTICE:    - 2 notifications
NOTICE:    - 8 additional activities
```

The script also includes verification queries at the end that show counts for each table.

## What You Can Test

With this test data, you can verify:

### Task Management
- ✅ Kanban board with tasks in different columns
- ✅ Task detail panel with tags, assignees, messages
- ✅ Task archiving (one archived task included)
- ✅ Task status changes and drag-and-drop

### Agent Features
- ✅ Agent detail view with metrics
- ✅ Agent assignments to tasks
- ✅ Agent status (active/idle)
- ✅ Agent avatars and role tags

### Messaging
- ✅ Task comments/messages
- ✅ Chat threads between user and agents
- ✅ Message mentions (@mentions)
- ✅ Message attachments (documents)

### Documents
- ✅ Documents linked to tasks
- ✅ Different document types (deliverable, research, protocol)
- ✅ Documents attached to messages

### Proposals
- ✅ Proposal management (pending, approved, rejected)
- ✅ Proposal-to-task conversion workflow

### Activity Feed
- ✅ Real-time activity stream
- ✅ Event tags and originators
- ✅ Step completions and status changes

### Cost Tracking
- ✅ Cost records per agent
- ✅ Budget limits and current spending
- ✅ Cost by source (LLM API, tool usage)

### Notifications
- ✅ Mention notifications
- ✅ Thread subscription notifications
- ✅ Delivered vs undelivered status

## Resetting Test Data

To clear test data and start fresh:

```sql
-- WARNING: This will delete ALL data, not just test data
-- Only run this if you want to completely reset your database

-- Delete in reverse order of dependencies
DELETE FROM notifications WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM thread_subscriptions WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM message_attachments WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM message_mentions WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM messages WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM documents WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM activities WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM costs WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM proposals WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM task_assignments WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM tasks WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM chat_threads WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
```

Or simply re-run the seed script - it will create new data (some items may have conflicts, but most will be created).

## Troubleshooting

### Data Not Showing in UI

**Most Common Issue: Agents Missing tenant_id**

If you don't see any data in the UI, the most likely cause is that agents don't have `tenant_id` set. This happens if agents were created before the multi-tenant migration.

**Quick Fix:**
```bash
./fix-and-seed.sh
```

This script will:
1. Fix agent tenant_ids
2. Seed all test data

**Manual Fix:**
```bash
# Fix tenant_ids first
docker exec -i mission-control-db psql -U postgres -d mission_control < fix-agent-tenant-ids.sql

# Then seed data
docker exec -i mission-control-db psql -U postgres -d mission_control < seed-test-data.sql
```

**Verify agents have tenant_id:**
```bash
docker exec -i mission-control-db psql -U postgres -d mission_control -c "SELECT name, tenant_id IS NOT NULL as has_tenant_id FROM agents;"
```

All agents should show `has_tenant_id = t` (true).

### Other Common Issues

**Error: relation "agents" does not exist**
- Make sure you've run the schema first: `backend/supabase/schema.sql`

**Error: agents not found**
- Make sure agents are initialized: Run `init-agents.sql` or `npm run init-agents-direct`

**Error: tenant_id constraint violation**
- Make sure the multi-tenant migration has been applied: `backend/supabase/migrations/add_multi_tenant_support.sql`

**Duplicate key errors**
- This is normal if you run the script multiple times. The script uses `ON CONFLICT DO NOTHING` where possible, but some items may still show conflicts.

**Frontend shows empty but data exists in database**
- Check browser console for errors
- Verify Supabase connection URL is correct
- Check that tenant context is set to default tenant ID: `00000000-0000-0000-0000-000000000000`
- Clear browser localStorage and reload: `localStorage.clear()` then refresh

## Next Steps

After seeding test data:

1. Start your frontend: `cd frontend && npm start`
2. Open http://localhost:4200
3. Explore the different features:
   - Check the Kanban board for tasks
   - Click on tasks to see detail panels
   - View agent details in the agents panel
   - Check the activity feed for events
   - Test chat functionality
   - Review proposals and costs
