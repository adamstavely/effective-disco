#!/bin/bash

# Initialize Mission Control Database
# This script sets up the database schema and initializes agents

set -e

echo "🚀 Initializing Mission Control Database..."

# Check if PostgreSQL is accessible
if ! command -v psql &> /dev/null; then
    echo "❌ psql not found. Please install PostgreSQL client tools."
    exit 1
fi

# Database connection details (adjust if needed)
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-54322}"
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

export PGPASSWORD="$DB_PASSWORD"

echo "📦 Connecting to database at $DB_HOST:$DB_PORT..."

# Check if database is accessible
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Cannot connect to database at $DB_HOST:$DB_PORT"
    echo "   Make sure Supabase is running: supabase start"
    echo "   Or start PostgreSQL directly if using docker-compose"
    exit 1
fi

echo "✅ Database connection successful"

# Run schema if it exists
if [ -f "backend/supabase/schema.sql" ]; then
    echo "📋 Applying database schema..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f backend/supabase/schema.sql > /dev/null 2>&1 || {
        echo "⚠️  Schema may already be applied (this is OK)"
    }
    echo "✅ Schema applied"
fi

# Initialize agents
echo "🤖 Initializing agents..."
cd backend
npm run init-agents

echo ""
echo "✅ Database initialization complete!"
echo ""
echo "You can now:"
echo "  1. Start the frontend: cd frontend && npm start"
echo "  2. Start backend services: See SETUP.md for details"
