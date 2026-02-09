import * as agentsFunctions from "../../backend/supabase/functions/agents";
import * as chatFunctions from "../../backend/supabase/functions/chat";
import * as notificationsFunctions from "../../backend/supabase/functions/notifications";
import { createJarvis } from "../../backend/agents/jarvis";
import { createShuri } from "../../backend/agents/shuri";
import { createFriday } from "../../backend/agents/friday";

const agentCreators: Record<string, () => any> = {
  "agent:main:main": createJarvis,
  "agent:product-analyst:main": createShuri,
  "agent:developer:main": createFriday,
};

/**
 * Process chat messages for a specific agent
 */
async function processChatMessagesForAgent(agent: any): Promise<void> {
  try {
    // Get unprocessed chat messages for this agent
    const messages = await chatFunctions.getUnprocessedChatMessages(
      agent.id,
      agent.tenant_id
    );

    if (messages.length === 0) return;

    // Get agent creator
    const createAgent = agentCreators[agent.session_key];
    if (!createAgent) {
      console.log(`No agent creator found for ${agent.session_key}`);
      return;
    }

    // Process each message
    for (const message of messages) {
      try {
        // Get chat thread details
        const thread = await chatFunctions.getChatThread(
          message.chat_thread_id,
          agent.tenant_id
        );

        if (!thread) {
          console.error(`Chat thread not found: ${message.chat_thread_id}`);
          continue;
        }

        // Get chat history for context
        const chatHistory = await chatFunctions.getChatHistory(
          message.chat_thread_id,
          agent.tenant_id
        );

        // Initialize agent instance
        const agentInstance = createAgent();
        await agentInstance.initialize();

        // Load chat history into agent's session
        // Convert chat messages to agent's expected format
        if (agentInstance.loadChatHistory && typeof agentInstance.loadChatHistory === 'function') {
          await agentInstance.loadChatHistory(chatHistory);
        } else {
          // Fallback: manually add to session history
          for (const histMsg of chatHistory) {
            if (histMsg.from_agent_id === null) {
              // User message (user-to-agent thread)
              agentInstance.sessionHistory.push({
                role: "human",
                content: histMsg.content
              });
            } else if (histMsg.from_agent_id === agent.id) {
              // Message from this agent (assistant role)
              agentInstance.sessionHistory.push({
                role: "assistant",
                content: histMsg.content
              });
            } else {
              // Message from another agent (agent-to-agent thread) - treat as human input
              agentInstance.sessionHistory.push({
                role: "human",
                content: histMsg.content
              });
            }
          }
        }

        // Execute agent with the message
        // For user messages: message.content is the user's message
        // For agent-to-agent messages: message.content is from another agent
        const response = await agentInstance.execute(message.content);

        // Save agent response to database
        await chatFunctions.createAgentChatMessage(
          message.chat_thread_id,
          agent.id,
          response,
          agent.tenant_id
        );

        // Mark the notification as delivered
        // Find the notification for this message
        const notifications = await notificationsFunctions.getUndeliveredNotifications(agent.id);
        const matchingNotif = notifications.find(
          (n: any) => n.content === message.content &&
          Math.abs(n.created_at - message.created_at) < 1000
        );

        if (matchingNotif) {
          await notificationsFunctions.markNotificationDelivered(matchingNotif.id);
        }

        const messageType = message.from_agent_id === null ? 'user' : 'agent';
        console.log(`✅ Agent ${agent.name} responded to ${messageType} message in thread ${message.chat_thread_id}`);
      } catch (error) {
        console.error(`Error processing chat message for ${agent.name}:`, error);
        // Continue processing other messages
      }
    }
  } catch (error) {
    console.error(`Error in processChatMessagesForAgent for ${agent.name}:`, error);
  }
}

/**
 * Process chat messages for all agents
 */
async function processChatMessages(): Promise<void> {
  try {
    // Get all agents (we'll process by tenant to ensure isolation)
    const agents = await agentsFunctions.getAllAgents();

    // Group agents by tenant
    const agentsByTenant = new Map<string, any[]>();
    for (const agent of agents) {
      const tenantId = agent.tenant_id || '00000000-0000-0000-0000-000000000000';
      if (!agentsByTenant.has(tenantId)) {
        agentsByTenant.set(tenantId, []);
      }
      agentsByTenant.get(tenantId)!.push(agent);
    }

    // Process each tenant's agents
    for (const [tenantId, tenantAgents] of agentsByTenant) {
      for (const agent of tenantAgents) {
        await processChatMessagesForAgent(agent);
      }
    }
  } catch (error) {
    console.error("Error in chat message processor:", error);
  }
}

export function startChatDaemon(): void {
  console.log("Starting chat message daemon...");
  
  // Poll every 2 seconds for new chat messages
  setInterval(() => {
    processChatMessages().catch(console.error);
  }, 2000);

  // Initial processing
  processChatMessages().catch(console.error);

  console.log("Chat message daemon started");
}

if (require.main === module) {
  startChatDaemon();
  // Keep process alive
  setInterval(() => {}, 1000);
}
