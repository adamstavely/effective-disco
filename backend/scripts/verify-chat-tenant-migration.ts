#!/usr/bin/env node

/**
 * Phase 1.3: Verify Chat Tenant Migration
 * Verifies that add_tenant_id_to_chat_threads.sql migration is applied
 * and checks that all chat-related tables have tenant_id columns
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TableCheck {
  tableName: string;
  hasTenantId: boolean;
  isRequired: boolean;
  hasIndex: boolean;
}

async function verifyChatTenantMigration() {
  console.log('🔍 Phase 1.3: Verifying Chat Tenant Migration\n');

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

    // Chat-related tables that should have tenant_id
    const chatTables = [
      'chat_threads',
      'messages',
      'message_mentions',
      'message_attachments'
    ];

    console.log('📋 Checking chat-related tables for tenant_id columns...\n');

    const checks: TableCheck[] = [];

    // Check each table
    for (const tableName of chatTables) {
      // Check if table exists
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [tableName]);

      if (!tableExists.rows[0].exists) {
        console.log(`⚠️  Table ${tableName} does not exist - skipping\n`);
        continue;
      }

      // Check if tenant_id column exists
      const columnCheck = await client.query(`
        SELECT 
          column_name,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'tenant_id'
      `, [tableName]);

      const hasTenantId = columnCheck.rows.length > 0;
      const isRequired = hasTenantId && columnCheck.rows[0].is_nullable === 'NO';

      // Check if index exists on tenant_id
      // Check for common index name patterns
      const indexCheck = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = $1 
        AND (
          indexname LIKE '%tenant%' 
          OR indexdef LIKE '%tenant_id%'
        )
      `, [tableName]);

      const hasIndex = indexCheck.rows.length > 0;

      checks.push({
        tableName,
        hasTenantId,
        isRequired,
        hasIndex
      });

      // Display status
      if (hasTenantId) {
        const requiredStatus = isRequired ? 'NOT NULL' : 'NULLABLE';
        const indexStatus = hasIndex ? '✅' : '⚠️';
        console.log(`✅ ${tableName}: tenant_id exists (${requiredStatus}) ${indexStatus} index`);
      } else {
        console.log(`❌ ${tableName}: tenant_id column MISSING`);
      }
    }

    console.log('\n');

    // Check if migration needs to be applied
    const chatThreadsCheck = checks.find(c => c.tableName === 'chat_threads');
    const needsMigration = !chatThreadsCheck?.hasTenantId;

    if (needsMigration) {
      console.log('📝 Migration needed: add_tenant_id_to_chat_threads.sql\n');
      console.log('Applying migration...\n');

      const projectRoot = join(__dirname, '../..');
      const migrationPath = join(projectRoot, 'backend/supabase/migrations/add_tenant_id_to_chat_threads.sql');
      
      try {
        const migrationSql = readFileSync(migrationPath, 'utf-8');
        await client.query(migrationSql);
        console.log('✅ Migration applied successfully\n');
        
        // Re-check chat_threads
        const recheck = await client.query(`
          SELECT column_name, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'chat_threads' AND column_name = 'tenant_id'
        `);
        
        if (recheck.rows.length > 0) {
          console.log('✅ Verified: tenant_id column now exists in chat_threads\n');
        } else {
          console.log('❌ Error: tenant_id column still missing after migration\n');
        }
      } catch (err: any) {
        console.error(`❌ Error applying migration: ${err.message}\n`);
        throw err;
      }
    } else {
      console.log('✅ Migration already applied: add_tenant_id_to_chat_threads.sql\n');
    }

    // Final verification summary
    console.log('📊 Final Verification Summary:\n');
    console.log('Chat-related tables tenant_id status:');
    console.log('─'.repeat(60));

    let allGood = true;
    for (const check of checks) {
      const status = check.hasTenantId 
        ? (check.isRequired ? '✅ REQUIRED' : '⚠️  NULLABLE')
        : '❌ MISSING';
      
      const indexStatus = check.hasIndex ? '✅' : '⚠️  (no index)';
      
      console.log(`${check.tableName.padEnd(25)} ${status.padEnd(15)} ${indexStatus}`);
      
      if (!check.hasTenantId || !check.isRequired) {
        allGood = false;
      }
    }

    console.log('─'.repeat(60));
    console.log('\n');

    // Check if messages table has tenant_id (should be from multi-tenant migration)
    const messagesCheck = checks.find(c => c.tableName === 'messages');
    if (!messagesCheck?.hasTenantId) {
      console.log('⚠️  Warning: messages table is missing tenant_id');
      console.log('   This should have been added by add_multi_tenant_support.sql migration');
      console.log('   Please ensure that migration has been applied.\n');
    }

    // Check if message_mentions and message_attachments have tenant_id
    const mentionsCheck = checks.find(c => c.tableName === 'message_mentions');
    const attachmentsCheck = checks.find(c => c.tableName === 'message_attachments');
    
    if (!mentionsCheck?.hasTenantId || !attachmentsCheck?.hasTenantId) {
      console.log('⚠️  Warning: message_mentions or message_attachments missing tenant_id');
      console.log('   These should have been added by add_multi_tenant_support.sql migration');
      console.log('   Please ensure that migration has been applied.\n');
    }

    if (allGood) {
      console.log('✅ Phase 1.3 Complete: All chat-related tables have tenant_id columns!\n');
    } else {
      console.log('⚠️  Phase 1.3 Incomplete: Some tables are missing tenant_id columns\n');
      console.log('   Please apply the following migrations:');
      if (!chatThreadsCheck?.hasTenantId) {
        console.log('   - backend/supabase/migrations/add_tenant_id_to_chat_threads.sql');
      }
      if (!messagesCheck?.hasTenantId || !mentionsCheck?.hasTenantId || !attachmentsCheck?.hasTenantId) {
        console.log('   - backend/supabase/migrations/add_multi_tenant_support.sql');
      }
      console.log('');
    }

    await client.end();
    
    if (!allGood) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

verifyChatTenantMigration().catch(console.error);
