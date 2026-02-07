import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUndelivered = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("undelivered", (q) =>
        q.eq("mentionedAgentId", args.agentId).eq("delivered", false)
      )
      .collect();
  },
});

export const markDelivered = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { delivered: true });
  },
});

export const markAllDelivered = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const undelivered = await ctx.db
      .query("notifications")
      .withIndex("undelivered", (q) =>
        q.eq("mentionedAgentId", args.agentId).eq("delivered", false)
      )
      .collect();

    for (const notification of undelivered) {
      await ctx.db.patch(notification._id, { delivered: true });
    }
  },
});
