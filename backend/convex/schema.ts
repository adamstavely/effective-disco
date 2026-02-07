import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  agents: defineTable({
    name: v.string(),
    role: v.string(),
    status: v.union(v.literal("idle"), v.literal("active"), v.literal("blocked")),
    currentTaskId: v.union(v.id("tasks"), v.null()),
    sessionKey: v.string(),
    level: v.union(v.literal("intern"), v.literal("specialist"), v.literal("lead")),
    lastHeartbeat: v.number(),
  }).index("by_session_key", ["sessionKey"]),

  tasks: defineTable({
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("blocked")
    ),
    assigneeIds: v.array(v.id("agents")),
    createdAt: v.number(),
    updatedAt: v.number(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  })
    .index("by_status", ["status"])
    .index("by_assignee", ["assigneeIds"]),

  messages: defineTable({
    taskId: v.id("tasks"),
    fromAgentId: v.id("agents"),
    content: v.string(),
    attachments: v.array(v.id("documents")),
    createdAt: v.number(),
    mentions: v.array(v.id("agents")),
  })
    .index("by_task", ["taskId"])
    .index("by_agent", ["fromAgentId"]),

  activities: defineTable({
    type: v.string(),
    agentId: v.union(v.id("agents"), v.null()),
    taskId: v.union(v.id("tasks"), v.null()),
    message: v.string(),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_task", ["taskId"])
    .index("by_agent", ["agentId"]),

  documents: defineTable({
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
    createdAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_type", ["type"]),

  notifications: defineTable({
    mentionedAgentId: v.id("agents"),
    content: v.string(),
    taskId: v.union(v.id("tasks"), v.null()),
    delivered: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_agent", ["mentionedAgentId"])
    .index("undelivered", ["mentionedAgentId", "delivered"]),

  thread_subscriptions: defineTable({
    agentId: v.id("agents"),
    taskId: v.id("tasks"),
    subscribedAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_task", ["taskId"])
    .index("by_agent_task", ["agentId", "taskId"]),
});
