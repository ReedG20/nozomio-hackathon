import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const issueStatus = v.union(
  v.literal("backlog"),
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("done"),
  v.literal("cancelled"),
);

export const issuePriority = v.union(
  v.literal("none"),
  v.literal("urgent"),
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
);

export default defineSchema({
  users: defineTable({
    workosId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    pictureUrl: v.optional(v.string()),
  }).index("by_workosId", ["workosId"]),

  issues: defineTable({
    number: v.number(),
    title: v.string(),
    description: v.string(),
    status: issueStatus,
    priority: issuePriority,
    assigneeId: v.optional(v.id("users")),
    creatorId: v.id("users"),
  })
    .index("by_status", ["status"])
    .index("by_assignee", ["assigneeId"])
    .index("by_number", ["number"]),

  counters: defineTable({
    name: v.string(),
    value: v.number(),
  }).index("by_name", ["name"]),
});
