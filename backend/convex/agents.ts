import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("agents").collect();
  },
});

export const getById = query({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getBySessionKey = query({
  args: { sessionKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_session_key", (q) => q.eq("sessionKey", args.sessionKey))
      .first();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    sessionKey: v.string(),
    level: v.union(v.literal("intern"), v.literal("specialist"), v.literal("lead")),
  },
  handler: async (ctx, args) => {
    const agentId = await ctx.db.insert("agents", {
      name: args.name,
      role: args.role,
      status: "idle",
      currentTaskId: null,
      sessionKey: args.sessionKey,
      level: args.level,
      lastHeartbeat: Date.now(),
    });
    return agentId;
  },
});

export const update = mutation({
  args: {
    id: v.id("agents"),
    status: v.union(v.literal("idle"), v.literal("active"), v.literal("blocked")),
    currentTaskId: v.union(v.id("tasks"), v.null()),
    lastHeartbeat: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("agents"),
    status: v.union(v.literal("idle"), v.literal("active"), v.literal("blocked")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      lastHeartbeat: Date.now(),
    });
  },
});
