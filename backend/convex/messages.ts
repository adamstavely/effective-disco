import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    fromAgentId: v.id("agents"),
    content: v.string(),
    attachments: v.optional(v.array(v.id("documents"))),
    mentions: v.optional(v.array(v.id("agents"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      taskId: args.taskId,
      fromAgentId: args.fromAgentId,
      content: args.content,
      attachments: args.attachments || [],
      mentions: args.mentions || [],
      createdAt: now,
    });

    // Create activity
    const agent = await ctx.db.get(args.fromAgentId);
    await ctx.db.insert("activities", {
      type: "message_sent",
      agentId: args.fromAgentId,
      taskId: args.taskId,
      message: `${agent?.name || "Agent"} commented on task`,
      createdAt: now,
    });

    // Create notifications for mentions
    if (args.mentions && args.mentions.length > 0) {
      for (const mentionedId of args.mentions) {
        await ctx.db.insert("notifications", {
          mentionedAgentId: mentionedId,
          content: args.content,
          taskId: args.taskId,
          delivered: false,
          createdAt: now,
        });
      }
    }

    // Auto-subscribe agent to thread
    const existingSubscription = await ctx.db
      .query("thread_subscriptions")
      .withIndex("by_agent_task", (q) =>
        q.eq("agentId", args.fromAgentId).eq("taskId", args.taskId)
      )
      .first();

    if (!existingSubscription) {
      await ctx.db.insert("thread_subscriptions", {
        agentId: args.fromAgentId,
        taskId: args.taskId,
        subscribedAt: now,
      });
    }

    // Notify subscribers
    const subscribers = await ctx.db
      .query("thread_subscriptions")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    for (const subscription of subscribers) {
      if (subscription.agentId !== args.fromAgentId) {
        await ctx.db.insert("notifications", {
          mentionedAgentId: subscription.agentId,
          content: args.content,
          taskId: args.taskId,
          delivered: false,
          createdAt: now,
        });
      }
    }

    return messageId;
  },
});
