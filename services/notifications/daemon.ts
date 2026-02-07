import { ConvexHttpClient } from "convex/node";
import { api } from "../../backend/convex/_generated/api";
import { createJarvis } from "../../backend/agents/jarvis";
import { createShuri } from "../../backend/agents/shuri";
import { createFriday } from "../../backend/agents/friday";

const convexClient = new ConvexHttpClient(process.env.CONVEX_URL || "");

const agentCreators: Record<string, () => any> = {
  "agent:main:main": createJarvis,
  "agent:product-analyst:main": createShuri,
  "agent:developer:main": createFriday,
};

async function deliverNotifications(): Promise<void> {
  try {
    // Get all agents
    const agents = await convexClient.query(api.agents.getAll, {});

    for (const agent of agents) {
      // Get undelivered notifications
      const notifications = await convexClient.query(api.notifications.getUndelivered, {
        agentId: agent._id,
      });

      if (notifications.length === 0) continue;

      // Get agent creator
      const createAgent = agentCreators[agent.sessionKey];
      if (!createAgent) {
        console.log(`No agent creator found for ${agent.sessionKey}`);
        continue;
      }

      try {
        const agentInstance = createAgent();
        await agentInstance.initialize();

        // Deliver each notification
        for (const notification of notifications) {
          const message = `You have a notification: ${notification.content}`;
          await agentInstance.execute(message);

          // Mark as delivered
          await convexClient.mutation(api.notifications.markDelivered, {
            id: notification._id,
          });

          console.log(`Delivered notification to ${agent.name}`);
        }
      } catch (error) {
        console.error(`Error delivering notifications to ${agent.name}:`, error);
        // Notifications stay undelivered, will retry next cycle
      }
    }
  } catch (error) {
    console.error("Error in notification daemon:", error);
  }
}

export function startNotificationDaemon(): void {
  console.log("Starting notification daemon...");
  
  // Poll every 2 seconds
  setInterval(() => {
    deliverNotifications().catch(console.error);
  }, 2000);

  // Initial delivery
  deliverNotifications().catch(console.error);

  console.log("Notification daemon started");
}

if (require.main === module) {
  startNotificationDaemon();
  // Keep process alive
  setInterval(() => {}, 1000);
}
