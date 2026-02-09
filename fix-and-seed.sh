#!/bin/bash

# Comprehensive script to fix tenant_ids and seed test data

set -e

echo "🔧 Fixing tenant IDs and seeding test data..."
echo ""

# Check if Docker is available
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    echo "🐳 Using Docker Compose..."
    
    if ! docker ps --format '{{.Names}}' | grep -q 'mission-control-db'; then
        echo "⚠️  PostgreSQL container not running. Starting it..."
        docker compose up -d postgres
        echo "⏳ Waiting for PostgreSQL to be ready..."
        sleep 5
    fi
    
    until docker exec mission-control-db pg_isready -U postgres > /dev/null 2>&1; do
        echo "   Waiting for PostgreSQL..."
        sleep 2
    done
    
    echo "✅ PostgreSQL is ready!"
    echo ""
    echo "🔧 Step 1: Fixing agent tenant_ids..."
    docker exec -i mission-control-db psql -U postgres -d mission_control < fix-agent-tenant-ids.sql
    
    echo ""
    echo "🌱 Step 2: Seeding test data..."
    docker exec -i mission-control-db psql -U postgres -d mission_control < seed-test-data.sql
    
    echo ""
    echo "✅ Done! Check your UI now."
    
elif command -v supabase &> /dev/null; then
    echo "🔷 Using Supabase CLI..."
    
    if ! supabase status &> /dev/null; then
        echo "⚠️  Supabase is not running. Starting it..."
        supabase start
    fi
    
    DB_URL=$(supabase status --output json 2>/dev/null | grep -o '"DB URL": "[^"]*' | cut -d'"' -f4 || echo "postgresql://postgres:postgres@127.0.0.1:54322/postgres")
    
    echo "✅ Supabase is running"
    echo ""
    echo "🔧 Step 1: Fixing agent tenant_ids..."
    psql "$DB_URL" -f fix-agent-tenant-ids.sql
    
    echo ""
    echo "🌱 Step 2: Seeding test data..."
    psql "$DB_URL" -f seed-test-data.sql
    
    echo ""
    echo "✅ Done! Check your UI now."
    
elif command -v psql &> /dev/null; then
    echo "🐘 Using direct PostgreSQL connection..."
    
    DB_HOST="${DB_HOST:-127.0.0.1}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-mission_control}"
    DB_USER="${DB_USER:-postgres}"
    DB_PASSWORD="${DB_PASSWORD:-postgres}"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    echo "🔧 Step 1: Fixing agent tenant_ids..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f fix-agent-tenant-ids.sql
    
    echo ""
    echo "🌱 Step 2: Seeding test data..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f seed-test-data.sql
    
    echo ""
    echo "✅ Done! Check your UI now."
    
else
    echo "❌ No database connection method found!"
    exit 1
fi
