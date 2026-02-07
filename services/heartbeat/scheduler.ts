import * as cron from "node-cron";
import { createJarvis } from "../../backend/agents/jarvis";
import { createShuri } from "../../backend/agents/shuri";
import { createFriday } from "../../backend/agents/friday";
import { ConvexHttpClient } from "convex/node";
import { api } from "../../backend/convex/_generated/api";
import * as fs from "fs/promises";
import * as path from "path";

const convexClient = new ConvexHttpClient(process.env.CONVEX_URL || "");

interface AgentSchedule {
  name: string;
  cron: string;
  createAgent: () => any;
  sessionKey: string;
}

const agents: AgentSchedule[] = [
  {
    name: "Jarvis",
    cron: "0 * * * *", // Every hour at :00
    createAgent: createJarvis,
    sessionKey: "agent:main:main",
  },
  {
    name: "Shuri",
    cron: "2 * * * *", // Every hour at :02
    createAgent: createShuri,
    sessionKey: "agent:product-analyst:main",
  },
  {
    name: "Friday",
    cron: "4 * * * *", // Every hour at :04
    createAgent: createFriday,
    sessionKey: "agent:developer:main",
  },
];

async function executeHeartbeat(agentSchedule: AgentSchedule): Promise<void> {
  console.log(`[${new Date().toISOString()}] Heartbeat: ${agentSchedule.name}`);

  try {
    const agent = agentSchedule.createAgent();
    await agent.initialize();

    // Load WORKING.md
    const workspacePath = path.join(process.cwd(), "workspace", "agents", agentSchedule.name.toLowerCase());
    const workingPath = path.join(workspacePath, "memory", "WORKING.md");
    const workingContent = await fs.readFile(workingPath, "utf-8").catch(() => "");

    // Check for notifications
    const dbAgent = await convexClient.query(api.agents.getBySessionKey, {
      sessionKey: agentSchedule.sessionKey,
    });

    if (!dbAgent) {
      console.log(`Agent ${agentSchedule.name} not found in database`);
      return;
    }

    const notifications = await convexClient.query(api.notifications.getUndelivered, {
      agentId: dbAgent._id,
    });

    // Check for assigned tasks
    const assignedTasks = await convexClient.query(api.tasks.getByAssignee, {
      agentId: dbAgent._id,
    });

    // Build heartbeat message
    let heartbeatMessage = `You are ${agentSchedule.name}, the ${dbAgent.role}. `;
    heartbeatMessage += `Check Mission Control for new tasks and notifications.\n\n`;

    if (workingContent && !workingContent.includes("None")) {
      heartbeatMessage += `Current task state:\n${workingContent}\n\n`;
    }

    if (notifications.length > 0) {
      heartbeatMessage += `You have ${notifications.length} new notification(s). `;
      heartbeatMessage += notifications.map((n) => n.content).join("\n");
      heartbeatMessage += "\n\n";
    }

    if (assignedTasks.length > 0) {
      heartbeatMessage += `You have ${assignedTasks.length} assigned task(s). `;
      heartbeatMessage += `Review them and start working if needed.\n\n`;
    }

    if (!workingContent.includes("None") || notifications.length > 0 || assignedTasks.length > 0) {
      heartbeatMessage += "Take action on the above. Otherwise, reply with HEARTBEAT_OK.";
    } else {
      heartbeatMessage += "If there's no work, reply with HEARTBEAT_OK.";
    }

    // Execute heartbeat
    const response = await agent.execute(heartbeatMessage);

    // Update agent status
    const isActive = !response.includes("HEARTBEAT_OK");
    await convexClient.mutation(api.agents.updateStatus, {
      id: dbAgent._id,
      status: isActive ? "active" : "idle",
    });

    // Mark notifications as delivered
    if (notifications.length > 0) {
      await convexClient.mutation(api.notifications.markAllDelivered, {
        agentId: dbAgent._id,
      });
    }

    console.log(`[${new Date().toISOString()}] Heartbeat complete: ${agentSchedule.name} - ${response.substring(0, 100)}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Heartbeat error for ${agentSchedule.name}:`, error);
  }
}

export function startHeartbeatScheduler(): void {
  console.log("Starting heartbeat scheduler...");

  agents.forEach((agentSchedule) => {
    cron.schedule(agentSchedule.cron, () => {
      executeHeartbeat(agentSchedule).catch(console.error);
    });
    console.log(`Scheduled ${agentSchedule.name} with cron: ${agentSchedule.cron}`);
  });

  console.log("Heartbeat scheduler started");
}

if (require.main === module) {
  startHeartbeatScheduler();
  // Keep process alive
  setInterval(() => {}, 1000);
}
