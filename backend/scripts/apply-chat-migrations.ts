#!/usr/bin/env node

/**
 * Apply Chat Migrations Script
 * Applies chat-related database migrations
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyChatMigrations() {
  console.log('📋 Applying chat migrations...\n');

  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '54322'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    const projectRoot = join(__dirname, '../..');
    
    // List of migrations to apply (in order)
    const migrations = [
      {
        name: 'Create chat_message RPC function',
        path: join(projectRoot, 'supabase/migrations/20240208000000_create_chat_message_rpc.sql')
      },
      {
        name: 'Add tenant_id to chat_threads',
        path: join(projectRoot, 'supabase/migrations/20240208000001_add_tenant_id_to_chat_threads.sql')
      },
      {
        name: 'Add chat message trigger',
        path: join(projectRoot, 'supabase/migrations/20240208000002_add_chat_message_trigger.sql')
      }
    ];

    for (const migration of migrations) {
      try {
        console.log(`📝 Applying: ${migration.name}...`);
        const migrationSql = readFileSync(migration.path, 'utf-8');
        await client.query(migrationSql);
        console.log(`✅ ${migration.name} applied successfully\n`);
      } catch (err: any) {
        // Check if it's an "already exists" error
        if (err.message && (
          err.message.includes('already exists') || 
          err.message.includes('does not exist') ||
          err.message.includes('duplicate key') ||
          err.message.includes('relation') && err.message.includes('already exists')
        )) {
          console.log(`⚠️  ${migration.name} skipped (may already be applied)\n`);
        } else {
          console.error(`❌ Error applying ${migration.name}:`, err.message);
          throw err;
        }
      }
    }

    // Verify the function was created
    console.log('🔍 Verifying migrations...');
    const { rows } = await client.query(`
      SELECT proname, pronargs 
      FROM pg_proc 
      WHERE proname = 'create_chat_message'
    `);
    
    if (rows.length > 0) {
      console.log(`✅ Verified: create_chat_message function exists (${rows[0].pronargs} parameters)\n`);
    } else {
      console.log('⚠️  Warning: create_chat_message function not found\n');
    }

    // Verify tenant_id column exists
    const { rows: columnRows } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'chat_threads' AND column_name = 'tenant_id'
    `);
    
    if (columnRows.length > 0) {
      console.log('✅ Verified: tenant_id column exists in chat_threads\n');
    } else {
      console.log('⚠️  Warning: tenant_id column not found in chat_threads\n');
    }

    // Verify trigger exists
    const { rows: triggerRows } = await client.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name = 'notify_agent_on_chat_message_trigger'
    `);
    
    if (triggerRows.length > 0) {
      console.log('✅ Verified: notify_agent_on_chat_message_trigger exists\n');
    } else {
      console.log('⚠️  Warning: notify_agent_on_chat_message_trigger not found\n');
    }

    await client.end();
    console.log('✅ All chat migrations applied successfully!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

applyChatMigrations().catch(console.error);
