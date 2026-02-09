# Quick Fix: Data Not Showing in UI

If you don't see any test data in the UI, run this:

```bash
./fix-and-seed.sh
```

This will:
1. ✅ Fix agent tenant_ids (most common issue)
2. ✅ Seed all test data
3. ✅ Verify everything is set up correctly

## Why This Happens

The frontend filters all data by `tenant_id`. If agents were created before the multi-tenant migration, they won't have `tenant_id` set, so they won't appear in queries.

## Manual Steps

If the script doesn't work, do it manually:

```bash
# 1. Fix agent tenant_ids
docker exec -i mission-control-db psql -U postgres -d mission_control < fix-agent-tenant-ids.sql

# 2. Seed test data
docker exec -i mission-control-db psql -U postgres -d mission_control < seed-test-data.sql

# 3. Verify (should show 3 agents with tenant_id)
docker exec -i mission-control-db psql -U postgres -d mission_control -c "SELECT name, tenant_id IS NOT NULL as has_tenant_id FROM agents;"
```

## Still Not Working?

1. **Check browser console** - Look for Supabase connection errors
2. **Verify Supabase is running** - `supabase status` or `docker ps`
3. **Check tenant context** - Open browser console and run:
   ```javascript
   localStorage.getItem('mission_control_tenant_id')
   ```
   Should return: `00000000-0000-0000-0000-000000000000`
4. **Clear cache** - Try `localStorage.clear()` then refresh
