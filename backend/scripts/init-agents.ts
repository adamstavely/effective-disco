import { ConvexHttpClient } from "convex/node";
import { api } from "../convex/_generated/api";
import * as dotenv from "dotenv";

dotenv.config();

const convexClient = new ConvexHttpClient(process.env.CONVEX_URL || "");

async function initializeAgents() {
  console.log("Initializing agents in Convex database...");

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
      const existing = await convexClient.query(api.agents.getBySessionKey, {
        sessionKey: agentData.sessionKey,
      });

      if (existing) {
        console.log(`Agent ${agentData.name} already exists`);
        continue;
      }

      // Create agent
      const agentId = await convexClient.mutation(api.agents.create, agentData);
      console.log(`Created agent ${agentData.name} with ID: ${agentId}`);
    } catch (error) {
      console.error(`Error creating agent ${agentData.name}:`, error);
    }
  }

  console.log("Agent initialization complete!");
}

initializeAgents().catch(console.error);
