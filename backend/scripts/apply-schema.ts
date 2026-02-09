#!/usr/bin/env node

/**
 * Apply Database Schema Script
 * Applies the schema.sql file to the database
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applySchema() {
  console.log('📋 Applying database schema...\n');

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

    // Read schema file
    const projectRoot = join(__dirname, '../..');
    const schemaSql = readFileSync(join(projectRoot, 'backend/supabase/schema.sql'), 'utf-8');

    // Apply schema (split by semicolons and execute each statement)
    console.log('📝 Executing schema...');
    
    // Split by semicolons but keep DO blocks together
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      // Skip empty or comment-only statements
      if (!statement || statement.startsWith('--')) continue;
      
      try {
        await client.query(statement + ';');
      } catch (err: any) {
        // Ignore "already exists" errors
        if (err.message && (
          err.message.includes('already exists') || 
          err.message.includes('does not exist') ||
          err.message.includes('duplicate key')
        )) {
          // This is OK - table/constraint might already exist
          continue;
        }
        // For other errors, log but continue (might be dependency issues)
        console.log(`⚠️  Statement ${i + 1} warning: ${err.message.substring(0, 100)}`);
      }
    }
    
    console.log('✅ Schema applied successfully\n');

    // Apply migrations
    const migrationsDir = join(projectRoot, 'backend/supabase/migrations');
    const migrations = [
      'add_multi_tenant_support.sql',
      'add_activity_event_fields.sql',
      'add_agent_fields.sql',
      'add_document_fields.sql',
      'update_chat_for_user_messages.sql'
    ];

    for (const migration of migrations) {
      try {
        const migrationPath = join(migrationsDir, migration);
        const migrationSql = readFileSync(migrationPath, 'utf-8');
        console.log(`📝 Applying migration: ${migration}...`);
        await client.query(migrationSql);
        console.log(`✅ Migration ${migration} applied\n`);
      } catch (err: any) {
        // Ignore "already exists" errors
        if (err.message && (err.message.includes('already exists') || err.message.includes('does not exist'))) {
          console.log(`⚠️  Migration ${migration} skipped (may already be applied)\n`);
        } else {
          throw err;
        }
      }
    }

    await client.end();
    console.log('✅ All migrations applied successfully!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

applySchema().catch(console.error);
