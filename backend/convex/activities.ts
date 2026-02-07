import { v } from "convex/values";
import { query } from "./_generated/server";

export const getFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("activities")
      .order("desc")
      .take(limit);
  },
});

export const getByType = query({
  args: { type: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("activities")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .order("desc")
      .take(limit);
  },
});

export const getByAgent = query({
  args: { agentId: v.id("agents"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("activities")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(limit);
  },
});
