import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getAll = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .collect();
    }
    return await ctx.db.query("tasks").collect();
  },
});

export const getById = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", args.status as any))
      .collect();
  },
});

export const getByAssignee = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_assignee", (q) => q.eq("assigneeIds", [args.agentId]))
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    assigneeIds: v.optional(v.array(v.id("agents"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: args.assigneeIds && args.assigneeIds.length > 0 ? "assigned" : "inbox",
      assigneeIds: args.assigneeIds || [],
      createdAt: now,
      updatedAt: now,
      priority: args.priority,
    });

    // Create activity
    await ctx.db.insert("activities", {
      type: "task_created",
      agentId: null,
      taskId,
      message: `Task "${args.title}" created`,
      createdAt: now,
    });

    return taskId;
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("inbox"),
        v.literal("assigned"),
        v.literal("in_progress"),
        v.literal("review"),
        v.literal("done"),
        v.literal("blocked")
      )
    ),
    assigneeIds: v.optional(v.array(v.id("agents"))),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const assign = mutation({
  args: {
    id: v.id("tasks"),
    assigneeIds: v.array(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(args.id, {
      assigneeIds: args.assigneeIds,
      status: args.assigneeIds.length > 0 ? "assigned" : "inbox",
      updatedAt: Date.now(),
    });

    // Create activity
    await ctx.db.insert("activities", {
      type: "task_assigned",
      agentId: null,
      taskId: args.id,
      message: `Task assigned to ${args.assigneeIds.length} agent(s)`,
      createdAt: Date.now(),
    });
  },
});
