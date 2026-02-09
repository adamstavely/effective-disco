import * as agentsFunctions from "../../backend/supabase/functions/agents";
import * as notificationsFunctions from "../../backend/supabase/functions/notifications";
import { createJarvis } from "../../backend/agents/jarvis";
import { createShuri } from "../../backend/agents/shuri";
import { createFriday } from "../../backend/agents/friday";


const agentCreators: Record<string, () => any> = {
  "agent:main:main": createJarvis,
  "agent:product-analyst:main": createShuri,
  "agent:developer:main": createFriday,
};

async function deliverNotifications(): Promise<void> {
  try {
    // Get all agents
    const agents = await agentsFunctions.getAllAgents();

    for (const agent of agents) {
      // Get undelivered notifications
      const notifications = await notificationsFunctions.getUndeliveredNotifications(agent.id);

      if (notifications.length === 0) continue;

      // Get agent creator
      const createAgent = agentCreators[agent.session_key];
      if (!createAgent) {
        console.log(`No agent creator found for ${agent.session_key}`);
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
          await notificationsFunctions.markNotificationDelivered(notification.id);

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
