#!/usr/bin/env node

/**
 * Seed Test Data Script
 * Runs SQL scripts to fix tenant_ids and seed test data
 * Works with direct PostgreSQL connection (no Docker/Supabase CLI required)
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function seedTestData() {
  console.log('🌱 Seeding test data into Mission Control database...\n');

  // Use pg library for direct connection
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mission_control',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Read SQL files
    const projectRoot = join(__dirname, '../..');
    const fixTenantSql = readFileSync(join(projectRoot, 'fix-agent-tenant-ids.sql'), 'utf-8');
    const seedSql = readFileSync(join(projectRoot, 'seed-test-data.sql'), 'utf-8');

    // Step 1: Fix tenant_ids
    console.log('🔧 Step 1: Fixing agent tenant_ids...');
    await client.query(fixTenantSql);
    console.log('✅ Agent tenant_ids fixed\n');

    // Step 2: Seed test data
    console.log('🌱 Step 2: Seeding test data...');
    try {
      await client.query(seedSql);
      console.log('✅ Test data seeded successfully!\n');
    } catch (error: any) {
      console.error('❌ Error seeding data:', error.message);
      console.error('Error code:', error.code);
      console.error('Error detail:', error.detail);
      throw error;
    }

    // Verify data
    console.log('📊 Verifying data...\n');
    
    const agentsResult = await client.query(
      "SELECT COUNT(*) as count FROM agents WHERE tenant_id = '00000000-0000-0000-0000-000000000000'"
    );
    console.log(`✅ Agents: ${agentsResult.rows[0].count}`);

    const tasksResult = await client.query(
      "SELECT COUNT(*) as count FROM tasks WHERE tenant_id = '00000000-0000-0000-0000-000000000000'"
    );
    console.log(`✅ Tasks: ${tasksResult.rows[0].count}`);

    const messagesResult = await client.query(
      "SELECT COUNT(*) as count FROM messages WHERE tenant_id = '00000000-0000-0000-0000-000000000000'"
    );
    console.log(`✅ Messages: ${messagesResult.rows[0].count}`);

    const proposalsResult = await client.query(
      "SELECT COUNT(*) as count FROM proposals WHERE tenant_id = '00000000-0000-0000-0000-000000000000'"
    );
    console.log(`✅ Proposals: ${proposalsResult.rows[0].count}`);

    await client.end();
    console.log('\n✅ Done! Refresh your browser to see the test data.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Database connection failed. Make sure:');
      console.error('   1. PostgreSQL is running');
      console.error('   2. Database credentials are correct');
      console.error('   3. Set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD if needed');
    }
    await client.end();
    process.exit(1);
  }
}

seedTestData().catch(console.error);
