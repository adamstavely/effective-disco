#!/bin/bash

# Setup Mission Control Database using Docker Compose
# Run this script to start PostgreSQL and initialize agents

set -e

echo "🐳 Starting PostgreSQL with Docker Compose..."

# Start PostgreSQL container
docker compose up -d postgres || docker-compose up -d postgres

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if PostgreSQL is ready
until docker exec mission-control-db pg_isready -U postgres > /dev/null 2>&1; do
  echo "   Waiting for PostgreSQL..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Apply schema
echo "📋 Applying database schema..."
docker exec -i mission-control-db psql -U postgres -d mission_control < backend/supabase/schema.sql 2>&1 | grep -v "already exists" | grep -v "CREATE" | grep -v "ALTER" | grep -v "COMMENT" || true

echo "✅ Schema applied"

# Initialize agents using direct PostgreSQL connection
echo "🤖 Initializing agents..."
cd backend

# Set environment variables for direct PostgreSQL connection
export DB_HOST=127.0.0.1
export DB_PORT=5432
export DB_NAME=mission_control
export DB_USER=postgres
export DB_PASSWORD=postgres

# Run the direct initialization script
npm run init-agents-direct || {
  echo "⚠️  Direct script not found, trying alternative method..."
  # Fallback: use psql directly
  docker exec -i mission-control-db psql -U postgres -d mission_control <<EOF
INSERT INTO agents (name, role, session_key, level, status, last_heartbeat)
VALUES 
  ('Jarvis', 'Squad Lead', 'agent:main:main', 'lead', 'idle', EXTRACT(EPOCH FROM NOW()) * 1000),
  ('Shuri', 'Product Analyst', 'agent:product-analyst:main', 'specialist', 'idle', EXTRACT(EPOCH FROM NOW()) * 1000),
  ('Friday', 'Developer', 'agent:developer:main', 'specialist', 'idle', EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (session_key) DO NOTHING;
EOF
}

echo ""
echo "✅ Setup complete!"
echo ""
echo "Database is running at:"
echo "  Host: 127.0.0.1"
echo "  Port: 5432"
echo "  Database: mission_control"
echo "  User: postgres"
echo "  Password: postgres"
echo ""
echo "To stop: docker-compose down"
echo "To view logs: docker-compose logs -f postgres"
