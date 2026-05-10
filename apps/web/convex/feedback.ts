import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { ensureCurrentUser, requireIdentity } from "./users";

const feedbackStatus = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed"),
);

const feedbackValidator = v.object({
  _id: v.id("feedback"),
  _creationTime: v.number(),
  title: v.string(),
  body: v.string(),
  status: feedbackStatus,
  branch: v.optional(v.string()),
  prUrl: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  sandboxId: v.optional(v.string()),
  claudeSessionId: v.optional(v.string()),
  totalCostUsd: v.optional(v.number()),
  notifyPhone: v.optional(v.string()),
  creatorId: v.id("users"),
});

// Normalize a user-entered phone string to E.164. Accepts:
// - already E.164 (+15551234567)
// - 10-digit US (5551234567 -> +15551234567)
// - 11-digit starting with 1 (15551234567 -> +15551234567)
// Throws on anything else.
function normalizePhoneE164(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new Error("Phone number is required when notifications are enabled");
  }
  if (/^\+[1-9]\d{7,14}$/.test(trimmed)) {
    return trimmed;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  throw new Error(
    "Invalid phone number. Use a 10-digit US number or full E.164 (e.g. +15551234567).",
  );
}

export const submit = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    notifyPhone: v.optional(v.string()),
  },
  returns: v.id("feedback"),
  handler: async (ctx, args): Promise<Id<"feedback">> => {
    const user = await ensureCurrentUser(ctx);

    const title = args.title.trim();
    const body = args.body.trim();
    if (title.length === 0) {
      throw new Error("Title is required");
    }
    if (body.length === 0) {
      throw new Error("Feedback body is required");
    }

    let notifyPhone: string | undefined;
    if (args.notifyPhone !== undefined && args.notifyPhone.trim().length > 0) {
      notifyPhone = normalizePhoneE164(args.notifyPhone);
    }

    const id: Id<"feedback"> = await ctx.db.insert("feedback", {
      title,
      body,
      status: "pending",
      creatorId: user._id,
      ...(notifyPhone !== undefined ? { notifyPhone } : {}),
    });

    await ctx.scheduler.runAfter(0, internal.feedbackAgent.processFeedback, {
      id,
    });

    return id;
  },
});

export const listMine = query({
  args: {},
  returns: v.array(feedbackValidator),
  handler: async (ctx): Promise<Doc<"feedback">[]> => {
    await requireIdentity(ctx);
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return [];
    }
    const me = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q) => q.eq("workosId", identity.subject))
      .unique();
    if (me === null) {
      return [];
    }
    return await ctx.db
      .query("feedback")
      .withIndex("by_creator", (q) => q.eq("creatorId", me._id))
      .order("desc")
      .collect();
  },
});

export const _getFeedback = internalQuery({
  args: { id: v.id("feedback") },
  returns: v.union(
    v.object({
      _id: v.id("feedback"),
      title: v.string(),
      body: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (row === null) return null;
    return { _id: row._id, title: row.title, body: row.body };
  },
});

export const _getNotifyContext = internalQuery({
  args: { id: v.id("feedback") },
  returns: v.union(
    v.object({
      title: v.string(),
      prUrl: v.optional(v.string()),
      notifyPhone: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (row === null) return null;
    return {
      title: row.title,
      prUrl: row.prUrl,
      notifyPhone: row.notifyPhone,
    };
  },
});

export const _setRunning = internalMutation({
  args: {
    id: v.id("feedback"),
    sandboxId: v.optional(v.string()),
    branch: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing === null) {
      return null;
    }
    await ctx.db.patch(args.id, {
      status: "running",
      sandboxId: args.sandboxId ?? existing.sandboxId,
      branch: args.branch ?? existing.branch,
    });
    return null;
  },
});

export const _setSucceeded = internalMutation({
  args: {
    id: v.id("feedback"),
    prUrl: v.string(),
    branch: v.string(),
    claudeSessionId: v.optional(v.string()),
    totalCostUsd: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing === null) {
      return null;
    }
    await ctx.db.patch(args.id, {
      status: "succeeded",
      prUrl: args.prUrl,
      branch: args.branch,
      claudeSessionId: args.claudeSessionId,
      totalCostUsd: args.totalCostUsd,
      errorMessage: undefined,
    });
    return null;
  },
});

export const _setFailed = internalMutation({
  args: {
    id: v.id("feedback"),
    errorMessage: v.string(),
    branch: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (existing === null) {
      return null;
    }
    await ctx.db.patch(args.id, {
      status: "failed",
      errorMessage: args.errorMessage.slice(0, 4000),
      branch: args.branch ?? existing.branch,
    });
    return null;
  },
});
