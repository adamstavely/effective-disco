#!/bin/bash

# Debug script to check if test data exists and help troubleshoot

echo "🔍 Checking test data in Mission Control database..."
echo ""

# Check if Docker is available
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    echo "🐳 Using Docker Compose..."
    
    if ! docker ps --format '{{.Names}}' | grep -q 'mission-control-db'; then
        echo "❌ PostgreSQL container not running!"
        echo "   Start it with: docker compose up -d postgres"
        exit 1
    fi
    
    echo "✅ PostgreSQL container is running"
    echo ""
    echo "📊 Checking data..."
    echo ""
    
    docker exec -i mission-control-db psql -U postgres -d mission_control < check-test-data.sql
    
    echo ""
    echo "---"
    echo ""
    echo "If you see 0 counts above, the seed script hasn't been run yet."
    echo "Run: ./seed-test-data.sh"
    
elif command -v supabase &> /dev/null; then
    echo "🔷 Using Supabase CLI..."
    
    if ! supabase status &> /dev/null; then
        echo "❌ Supabase is not running!"
        echo "   Start it with: supabase start"
        exit 1
    fi
    
    DB_URL=$(supabase status --output json 2>/dev/null | grep -o '"DB URL": "[^"]*' | cut -d'"' -f4 || echo "postgresql://postgres:postgres@127.0.0.1:54322/postgres")
    
    echo "✅ Supabase is running"
    echo ""
    echo "📊 Checking data..."
    echo ""
    
    psql "$DB_URL" -f check-test-data.sql
    
    echo ""
    echo "---"
    echo ""
    echo "If you see 0 counts above, the seed script hasn't been run yet."
    echo "Run: ./seed-test-data.sh"
    
elif command -v psql &> /dev/null; then
    echo "🐘 Using direct PostgreSQL connection..."
    
    DB_HOST="${DB_HOST:-127.0.0.1}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-mission_control}"
    DB_USER="${DB_USER:-postgres}"
    DB_PASSWORD="${DB_PASSWORD:-postgres}"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    echo "📊 Checking data..."
    echo ""
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f check-test-data.sql
    
    echo ""
    echo "---"
    echo ""
    echo "If you see 0 counts above, the seed script hasn't been run yet."
    echo "Run: ./seed-test-data.sh"
    
else
    echo "❌ No database connection method found!"
    exit 1
fi
