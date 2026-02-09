#!/bin/bash

# Seed Test Data Script
# This script helps you seed test data into your Mission Control database

set -e

echo "🌱 Seeding test data into Mission Control database..."

# Check if Docker is available
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    echo "🐳 Using Docker Compose..."
    
    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q 'mission-control-db'; then
        echo "⚠️  PostgreSQL container not running. Starting it..."
        docker compose up -d postgres
        echo "⏳ Waiting for PostgreSQL to be ready..."
        sleep 5
    fi
    
    # Wait for PostgreSQL to be ready
    until docker exec mission-control-db pg_isready -U postgres > /dev/null 2>&1; do
        echo "   Waiting for PostgreSQL..."
        sleep 2
    done
    
    echo "✅ PostgreSQL is ready!"
    echo "📦 Loading test data..."
    
    docker exec -i mission-control-db psql -U postgres -d mission_control < seed-test-data.sql
    
    echo ""
    echo "✅ Test data seeded successfully!"
    echo ""
    echo "You can now:"
    echo "  1. Start the frontend: cd frontend && npm start"
    echo "  2. Open http://localhost:4200"
    echo "  3. Explore the test data in the UI"
    
# Check if Supabase CLI is available
elif command -v supabase &> /dev/null; then
    echo "🔷 Using Supabase CLI..."
    
    # Check if Supabase is running
    if ! supabase status &> /dev/null; then
        echo "⚠️  Supabase is not running. Starting it..."
        supabase start
    fi
    
    echo "📦 Loading test data..."
    
    # Get database URL from Supabase
    DB_URL=$(supabase status --output json 2>/dev/null | grep -o '"DB URL": "[^"]*' | cut -d'"' -f4 || echo "postgresql://postgres:postgres@127.0.0.1:54322/postgres")
    
    psql "$DB_URL" -f seed-test-data.sql
    
    echo ""
    echo "✅ Test data seeded successfully!"
    
# Try direct PostgreSQL connection
elif command -v psql &> /dev/null; then
    echo "🐘 Using direct PostgreSQL connection..."
    
    DB_HOST="${DB_HOST:-127.0.0.1}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-mission_control}"
    DB_USER="${DB_USER:-postgres}"
    DB_PASSWORD="${DB_PASSWORD:-postgres}"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    echo "📦 Loading test data..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f seed-test-data.sql
    
    echo ""
    echo "✅ Test data seeded successfully!"
    
else
    echo "❌ No database connection method found!"
    echo ""
    echo "Please install one of:"
    echo "  - Docker (for Docker Compose)"
    echo "  - Supabase CLI (brew install supabase/tap/supabase)"
    echo "  - PostgreSQL client (psql)"
    echo ""
    echo "Or run manually:"
    echo "  docker exec -i mission-control-db psql -U postgres -d mission_control < seed-test-data.sql"
    exit 1
fi
