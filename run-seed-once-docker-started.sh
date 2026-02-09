#!/bin/bash

# Run this script AFTER starting Docker Desktop
# This will start Supabase and seed test data

set -e

echo "🚀 Starting Supabase and seeding test data..."
echo ""

# Step 1: Start Supabase
echo "📦 Step 1: Starting Supabase..."
supabase start

echo ""
echo "⏳ Waiting for Supabase to be ready..."
sleep 3

# Step 2: Seed test data
echo ""
echo "🌱 Step 2: Seeding test data..."
cd backend
DB_PORT=54322 npm run seed-test-data

echo ""
echo "✅ Done! Your test data is now seeded."
echo "   Refresh your browser to see the data in the UI."
