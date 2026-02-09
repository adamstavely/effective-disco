# Apply Chat Migrations

The chat system requires several database migrations to be applied. Follow these steps:

## Required Migrations

1. **Create chat_message RPC function** - `supabase/migrations/20240208000000_create_chat_message_rpc.sql`
2. **Add tenant_id to chat_threads** - `backend/supabase/migrations/add_tenant_id_to_chat_threads.sql`
3. **Add chat message trigger** - `backend/supabase/migrations/add_chat_message_trigger.sql`

## Option 1: Using Supabase CLI (Recommended)

If you have Supabase CLI set up locally:

```bash
# Apply all pending migrations
supabase migration up

# Or apply specific migration
supabase db push
```

## Option 2: Using psql directly

If you're running Supabase locally via Docker:

```bash
# Get the database connection details
# Default local Supabase: host=127.0.0.1, port=54322, user=postgres, password=postgres, database=postgres

# Apply migrations one by one
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/migrations/20240208000000_create_chat_message_rpc.sql
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f backend/supabase/migrations/add_tenant_id_to_chat_threads.sql
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f backend/supabase/migrations/add_chat_message_trigger.sql
```

## Option 3: Using Supabase Studio

1. Open Supabase Studio at http://127.0.0.1:54323
2. Go to SQL Editor
3. Copy and paste the contents of each migration file
4. Run each migration

## Quick Apply Script

You can also create a script to apply all migrations at once:

```bash
#!/bin/bash
# apply-chat-migrations.sh

DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-54322}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-postgres}

echo "Applying chat migrations..."

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f supabase/migrations/20240208000000_create_chat_message_rpc.sql
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f backend/supabase/migrations/add_tenant_id_to_chat_threads.sql
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f backend/supabase/migrations/add_chat_message_trigger.sql

echo "Migrations applied successfully!"
```

## Verify Installation

After applying migrations, verify the function exists:

```sql
-- Check if function exists
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname = 'create_chat_message';

-- Should return 1 row with proname='create_chat_message' and pronargs=5
```

## Troubleshooting

If you get an error about the function not existing:
1. Make sure you've applied the migration `20240208000000_create_chat_message_rpc.sql`
2. Check that you're connected to the correct database
3. Verify the function was created: `\df create_chat_message` in psql

If you get an error about tenant_id:
1. Make sure `add_tenant_id_to_chat_threads.sql` has been applied
2. Verify the column exists: `\d chat_threads` in psql
