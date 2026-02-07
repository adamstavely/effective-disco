import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const subscribe = mutation({
  args: {
    agentId: v.id("agents"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("thread_subscriptions")
      .withIndex("by_agent_task", (q) =>
        q.eq("agentId", args.agentId).eq("taskId", args.taskId)
      )
      .first();

    if (!existing) {
      await ctx.db.insert("thread_subscriptions", {
        agentId: args.agentId,
        taskId: args.taskId,
        subscribedAt: Date.now(),
      });
    }
  },
});

export const getSubscribers = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("thread_subscriptions")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
  },
});
