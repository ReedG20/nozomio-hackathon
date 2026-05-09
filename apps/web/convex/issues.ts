import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, mutation, query } from "./_generated/server";
import { issuePriority, issueStatus } from "./schema";
import { ensureCurrentUser, requireIdentity } from "./users";

const userRefValidator = v.union(
  v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    workosId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    pictureUrl: v.optional(v.string()),
  }),
  v.null(),
);

const issueWithRefsValidator = v.object({
  _id: v.id("issues"),
  _creationTime: v.number(),
  number: v.number(),
  title: v.string(),
  description: v.string(),
  status: issueStatus,
  priority: issuePriority,
  assigneeId: v.optional(v.id("users")),
  creatorId: v.id("users"),
  creator: userRefValidator,
  assignee: userRefValidator,
});

async function joinUsers(
  ctx: { db: { get: (id: Id<"users">) => Promise<Doc<"users"> | null> } },
  issue: Doc<"issues">,
) {
  const [creator, assignee] = await Promise.all([
    ctx.db.get(issue.creatorId),
    issue.assigneeId ? ctx.db.get(issue.assigneeId) : Promise.resolve(null),
  ]);
  return { ...issue, creator, assignee };
}

async function nextIssueNumber(ctx: MutationCtx): Promise<number> {
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("name", "issues"))
    .unique();
  if (counter === null) {
    await ctx.db.insert("counters", { name: "issues", value: 1 });
    return 1;
  }
  const next = counter.value + 1;
  await ctx.db.patch(counter._id, { value: next });
  return next;
}

export const list = query({
  args: {},
  returns: v.array(issueWithRefsValidator),
  handler: async (ctx) => {
    await requireIdentity(ctx);
    const issues = await ctx.db.query("issues").order("desc").collect();
    return await Promise.all(issues.map((issue) => joinUsers(ctx, issue)));
  },
});

export const get = query({
  args: { id: v.id("issues") },
  returns: v.union(issueWithRefsValidator, v.null()),
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    const issue = await ctx.db.get(args.id);
    if (issue === null) {
      return null;
    }
    return await joinUsers(ctx, issue);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    status: issueStatus,
    priority: issuePriority,
    assigneeId: v.optional(v.id("users")),
  },
  returns: v.id("issues"),
  handler: async (ctx, args): Promise<Id<"issues">> => {
    const user = await ensureCurrentUser(ctx);
    if (args.title.trim().length === 0) {
      throw new Error("Title is required");
    }
    const number = await nextIssueNumber(ctx);
    return await ctx.db.insert("issues", {
      number,
      title: args.title.trim(),
      description: args.description,
      status: args.status,
      priority: args.priority,
      assigneeId: args.assigneeId,
      creatorId: user._id,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("issues"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(issueStatus),
    priority: v.optional(issuePriority),
    assigneeId: v.optional(v.union(v.id("users"), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ensureCurrentUser(ctx);
    const existing = await ctx.db.get(args.id);
    if (existing === null) {
      throw new Error("Issue not found");
    }

    const patch: Partial<Doc<"issues">> = {};
    if (args.title !== undefined) {
      const trimmed = args.title.trim();
      if (trimmed.length === 0) {
        throw new Error("Title cannot be empty");
      }
      patch.title = trimmed;
    }
    if (args.description !== undefined) patch.description = args.description;
    if (args.status !== undefined) patch.status = args.status;
    if (args.priority !== undefined) patch.priority = args.priority;
    if (args.assigneeId !== undefined) {
      patch.assigneeId = args.assigneeId === null ? undefined : args.assigneeId;
    }

    await ctx.db.patch(args.id, patch);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("issues") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ensureCurrentUser(ctx);
    const existing = await ctx.db.get(args.id);
    if (existing === null) {
      return null;
    }
    await ctx.db.delete(args.id);
    return null;
  },
});
