import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { getSupabaseClient } from "../../supabase/client";
import * as agentsFunctions from "../../supabase/functions/agents";
import * as tasksFunctions from "../../supabase/functions/tasks";
import * as messagesFunctions from "../../supabase/functions/messages";
import * as documentsFunctions from "../../supabase/functions/documents";
import * as notificationsFunctions from "../../supabase/functions/notifications";

export interface AgentConfig {
  name: string;
  role: string;
  sessionKey: string;
  workspacePath: string;
  model?: "openai" | "anthropic";
  modelName?: string;
  temperature?: number;
}

export class Agent {
  private config: AgentConfig;
  private executor?: AgentExecutor;
  private sessionHistory: Array<{ role: string; content: string }> = [];

  constructor(config: AgentConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Load SOUL.md and AGENTS.md
    const soulPath = path.join(this.config.workspacePath, "SOUL.md");
    const agentsPath = path.join(this.config.workspacePath, "AGENTS.md");
    
    const soulContent = await fs.readFile(soulPath, "utf-8").catch(() => "");
    const agentsContent = await fs.readFile(agentsPath, "utf-8").catch(() => "");

    // Load session history
    await this.loadSessionHistory();

    // Create LLM
    const llm = this.createLLM();

    // Create tools
    const tools = await this.createTools();

    // Create prompt
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `${soulContent}\n\n${agentsContent}`],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    // Create agent
    const agent = await createOpenAIFunctionsAgent({
      llm,
      tools,
      prompt,
    });

    this.executor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
    });
  }

  private createLLM() {
    const modelName = this.config.modelName || process.env.AGENT_MODEL || "gpt-4";
    const temperature = this.config.temperature ?? 0.7;

    if (this.config.model === "anthropic" || modelName.includes("claude")) {
      return new ChatAnthropic({
        modelName: modelName as any,
        temperature,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    return new ChatOpenAI({
      modelName: modelName as any,
      temperature,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  private async createTools(): Promise<DynamicStructuredTool[]> {
    return [
      // Memory tools
      new DynamicStructuredTool({
        name: "read_working_memory",
        description: "Read the current task state from WORKING.md",
        schema: z.object({}),
        func: async () => {
          const workingPath = path.join(this.config.workspacePath, "memory", "WORKING.md");
          return await fs.readFile(workingPath, "utf-8").catch(() => "No current task");
        },
      }),

      new DynamicStructuredTool({
        name: "update_working_memory",
        description: "Update WORKING.md with current task state",
        schema: z.object({
          content: z.string().describe("The content to write to WORKING.md"),
        }),
        func: async ({ content }) => {
          const workingPath = path.join(this.config.workspacePath, "memory", "WORKING.md");
          await fs.writeFile(workingPath, content, "utf-8");
          return "WORKING.md updated";
        },
      }),

      new DynamicStructuredTool({
        name: "append_daily_note",
        description: "Append a timestamped note to today's daily notes file",
        schema: z.object({
          note: z.string().describe("The note to append"),
        }),
        func: async ({ note }) => {
          const today = new Date().toISOString().split("T")[0];
          const dailyPath = path.join(this.config.workspacePath, "memory", `${today}.md`);
          const timestamp = new Date().toISOString();
          const entry = `\n## ${timestamp}\n${note}\n`;
          await fs.appendFile(dailyPath, entry, "utf-8").catch(async () => {
            await fs.writeFile(dailyPath, `# ${today}\n${entry}`, "utf-8");
          });
          return "Daily note appended";
        },
      }),

      // Supabase tools
      new DynamicStructuredTool({
        name: "get_assigned_tasks",
        description: "Get all tasks assigned to this agent",
        schema: z.object({}),
        func: async () => {
          const agent = await agentsFunctions.getAgentBySessionKey(this.config.sessionKey);
          if (!agent) return "Agent not found in Mission Control";
          
          const tasks = await tasksFunctions.getTasksByAssignee(agent.id);
          return JSON.stringify(tasks, null, 2);
        },
      }),

      new DynamicStructuredTool({
        name: "get_task_details",
        description: "Get details of a specific task",
        schema: z.object({
          taskId: z.string().describe("The task ID"),
        }),
        func: async ({ taskId }) => {
          const task = await tasksFunctions.getTaskById(taskId);
          if (!task) return "Task not found";
          return JSON.stringify(task, null, 2);
        },
      }),

      new DynamicStructuredTool({
        name: "post_message",
        description: "Post a comment/message to a task thread",
        schema: z.object({
          taskId: z.string().describe("The task ID"),
          content: z.string().describe("The message content"),
          mentions: z.array(z.string()).optional().describe("Agent names to mention (@AgentName)"),
        }),
        func: async ({ taskId, content, mentions }) => {
          const agent = await agentsFunctions.getAgentBySessionKey(this.config.sessionKey);
          if (!agent) return "Agent not found in Mission Control";

          // Extract mentions from content if not provided
          let mentionIds: string[] = [];
          if (mentions && mentions.length > 0) {
            const allAgents = await agentsFunctions.getAllAgents();
            mentionIds = allAgents
              .filter((a) => mentions.includes(a.name))
              .map((a) => a.id);
          }

          await messagesFunctions.createMessage({
            taskId,
            fromAgentId: agent.id,
            content,
            mentions: mentionIds,
          });

          return "Message posted";
        },
      }),

      new DynamicStructuredTool({
        name: "update_task_status",
        description: "Update the status of a task",
        schema: z.object({
          taskId: z.string().describe("The task ID"),
          status: z.enum(["inbox", "assigned", "in_progress", "review", "done", "blocked"]),
        }),
        func: async ({ taskId, status }) => {
          await tasksFunctions.updateTask(taskId, { status });
          return `Task status updated to ${status}`;
        },
      }),

      new DynamicStructuredTool({
        name: "create_document",
        description: "Create a document in Mission Control",
        schema: z.object({
          title: z.string().describe("Document title"),
          content: z.string().describe("Document content (markdown)"),
          type: z.enum(["deliverable", "research", "protocol", "other"]),
          taskId: z.string().optional().describe("Optional task ID to attach to"),
        }),
        func: async ({ title, content, type, taskId }) => {
          const agent = await agentsFunctions.getAgentBySessionKey(this.config.sessionKey);
          if (!agent) return "Agent not found in Mission Control";

          await documentsFunctions.createDocument({
            title,
            content,
            type,
            createdBy: agent.id,
            taskId: taskId || null,
          });

          return "Document created";
        },
      }),

      new DynamicStructuredTool({
        name: "check_notifications",
        description: "Check for undelivered notifications",
        schema: z.object({}),
        func: async () => {
          const agent = await agentsFunctions.getAgentBySessionKey(this.config.sessionKey);
          if (!agent) return "Agent not found in Mission Control";

          const notifications = await notificationsFunctions.getUndeliveredNotifications(agent.id);

          if (notifications.length === 0) return "No new notifications";
          return JSON.stringify(notifications, null, 2);
        },
      }),

      // File system tools
      new DynamicStructuredTool({
        name: "read_file",
        description: "Read a file from the workspace",
        schema: z.object({
          filePath: z.string().describe("Relative path from workspace root"),
        }),
        func: async ({ filePath }) => {
          const fullPath = path.join(this.config.workspacePath, filePath);
          return await fs.readFile(fullPath, "utf-8").catch((err) => `Error: ${err.message}`);
        },
      }),

      new DynamicStructuredTool({
        name: "write_file",
        description: "Write content to a file in the workspace",
        schema: z.object({
          filePath: z.string().describe("Relative path from workspace root"),
          content: z.string().describe("File content"),
        }),
        func: async ({ filePath, content }) => {
          const fullPath = path.join(this.config.workspacePath, filePath);
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, content, "utf-8");
          return "File written";
        },
      }),
    ];
  }

  async execute(input: string): Promise<string> {
    if (!this.executor) {
      await this.initialize();
    }

    const result = await this.executor!.invoke({
      input,
      chat_history: this.sessionHistory,
    });

    // Save to session history
    this.sessionHistory.push({ role: "human", content: input });
    this.sessionHistory.push({ role: "assistant", content: result.output });
    await this.saveSessionHistory();

    return result.output;
  }

  private async loadSessionHistory(): Promise<void> {
    const sessionsDir = path.join(this.config.workspacePath, "sessions");
    await fs.mkdir(sessionsDir, { recursive: true });

    const today = new Date().toISOString().split("T")[0];
    const sessionFile = path.join(sessionsDir, `${today}.jsonl`);

    try {
      const content = await fs.readFile(sessionFile, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);
      this.sessionHistory = lines.map((line) => JSON.parse(line));
    } catch {
      this.sessionHistory = [];
    }
  }

  private async saveSessionHistory(): Promise<void> {
    const sessionsDir = path.join(this.config.workspacePath, "sessions");
    const today = new Date().toISOString().split("T")[0];
    const sessionFile = path.join(sessionsDir, `${today}.jsonl`);

    const lines = this.sessionHistory.map((entry) => JSON.stringify(entry));
    await fs.writeFile(sessionFile, lines.join("\n") + "\n", "utf-8");
  }

  /**
   * Load chat history from database messages
   * This allows agents to access chat context when responding to chat messages
   */
  async loadChatHistory(chatMessages: Array<{
    id: string;
    chat_thread_id: string;
    from_agent_id: string | null;
    content: string;
    created_at: number;
    tenant_id: string;
  }>): Promise<void> {
    // Clear existing session history or merge intelligently
    // For chat, we'll replace with chat history to ensure context is correct
    this.sessionHistory = [];

    // Convert chat messages to session history format
    for (const msg of chatMessages) {
      if (msg.from_agent_id === null) {
        // User message
        this.sessionHistory.push({
          role: "human",
          content: msg.content
        });
      } else {
        // Agent message
        this.sessionHistory.push({
          role: "assistant",
          content: msg.content
        });
      }
    }
  }

  /**
   * Save chat message to database (called after agent responds)
   * This is handled by the chat daemon, but agents can use this if needed
   */
  async saveChatMessage(threadId: string, content: string, agentId: string): Promise<void> {
    // This is typically handled by the chat daemon, but we keep the method
    // for potential direct use cases
    // The actual implementation would require Supabase client access
    // which is better handled at the daemon level
  }
}
