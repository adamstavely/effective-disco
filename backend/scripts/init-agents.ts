import * as dotenv from "dotenv";
import * as agentsFunctions from "../supabase/functions/agents";

dotenv.config();

async function initializeAgents() {
  console.log("Initializing agents in Supabase database...");

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
      const existing = await agentsFunctions.getAgentBySessionKey(agentData.sessionKey);

      if (existing) {
        console.log(`Agent ${agentData.name} already exists`);
        continue;
      }

      // Create agent
      const agent = await agentsFunctions.createAgent(agentData);
      console.log(`Created agent ${agentData.name} with ID: ${agent.id}`);
    } catch (error) {
      console.error(`Error creating agent ${agentData.name}:`, error);
    }
  }

  console.log("Agent initialization complete!");
}

initializeAgents().catch(console.error);
