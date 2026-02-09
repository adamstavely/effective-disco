import * as dotenv from "dotenv";
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// For Docker Compose setup, connect directly to PostgreSQL via Supabase client
// We'll use a mock Supabase URL but connect to the actual database
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwgnWNReilDMblYTn_I0';

// For Docker Compose, we need to use the direct PostgreSQL connection
// Since Supabase client needs the API, we'll use a workaround with direct DB connection
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: false,
  },
});

async function initializeAgents() {
  console.log("Initializing agents in database...");

  const agents = [
    {
      name: "Jarvis",
      role: "Squad Lead",
      sessionKey: "agent:main:main",
      level: "lead" as const,
    },
    {
      name: "Shuri",
      role: "Product Analyst",
      sessionKey: "agent:product-analyst:main",
      level: "specialist" as const,
    },
    {
      name: "Friday",
      role: "Developer",
      sessionKey: "agent:developer:main",
      level: "specialist" as const,
    },
  ];

  for (const agentData of agents) {
    try {
      // Check if agent already exists
      const { data: existing } = await supabase
        .from('agents')
        .select('*')
        .eq('session_key', agentData.sessionKey)
        .single();

      if (existing) {
        console.log(`✅ Agent ${agentData.name} already exists`);
        continue;
      }

      // Create agent
      const { data: agent, error } = await supabase
        .from('agents')
        .insert({
          name: agentData.name,
          role: agentData.role,
          session_key: agentData.sessionKey,
          level: agentData.level,
          status: 'idle',
          last_heartbeat: Date.now()
        })
        .select()
        .single();

      if (error) {
        // If error is about connection, try direct PostgreSQL
        if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
          console.log(`⚠️  Supabase API not available. Using direct PostgreSQL connection...`);
          await initializeAgentsDirect();
          return;
        }
        throw error;
      }

      console.log(`✅ Created agent ${agentData.name} with ID: ${agent.id}`);
    } catch (error: any) {
      console.error(`❌ Error creating agent ${agentData.name}:`, error.message || error);
    }
  }

  console.log("✅ Agent initialization complete!");
}

async function initializeAgentsDirect() {
  console.log("Using direct PostgreSQL connection...");
  
  // Use pg library for direct connection
  const { Client } = await import('pg');
  
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mission_control',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    await client.connect();
    console.log("✅ Connected to PostgreSQL");

    const agents = [
      { name: "Jarvis", role: "Squad Lead", sessionKey: "agent:main:main", level: "lead" },
      { name: "Shuri", role: "Product Analyst", sessionKey: "agent:product-analyst:main", level: "specialist" },
      { name: "Friday", role: "Developer", sessionKey: "agent:developer:main", level: "specialist" },
    ];

    for (const agentData of agents) {
      // Check if exists
      const checkResult = await client.query(
        'SELECT id FROM agents WHERE session_key = $1',
        [agentData.sessionKey]
      );

      if (checkResult.rows.length > 0) {
        console.log(`✅ Agent ${agentData.name} already exists`);
        continue;
      }

      // Ensure default tenant exists
      await client.query(`
        INSERT INTO tenants (id, name, slug, created_at, updated_at)
        VALUES ('00000000-0000-0000-0000-000000000000', 'Default Tenant', 'default', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `);

      // Insert agent with tenant_id
      const result = await client.query(
        `INSERT INTO agents (name, role, session_key, level, status, last_heartbeat, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, '00000000-0000-0000-0000-000000000000')
         RETURNING id`,
        [agentData.name, agentData.role, agentData.sessionKey, agentData.level, 'idle', Date.now()]
      );

      console.log(`✅ Created agent ${agentData.name} with ID: ${result.rows[0].id}`);
    }

    await client.end();
    console.log("✅ Agent initialization complete!");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    await client.end();
    process.exit(1);
  }
}

initializeAgents().catch(console.error);
