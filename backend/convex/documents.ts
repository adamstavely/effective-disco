import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("deliverable"),
      v.literal("research"),
      v.literal("protocol"),
      v.literal("other")
    ),
    taskId: v.union(v.id("tasks"), v.null()),
    createdBy: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      content: args.content,
      type: args.type,
      taskId: args.taskId,
      createdBy: args.createdBy,
      createdAt: now,
    });

    // Create activity
    const agent = await ctx.db.get(args.createdBy);
    await ctx.db.insert("activities", {
      type: "document_created",
      agentId: args.createdBy,
      taskId: args.taskId,
      message: `${agent?.name || "Agent"} created document "${args.title}"`,
      createdAt: now,
    });

    return documentId;
  },
});
