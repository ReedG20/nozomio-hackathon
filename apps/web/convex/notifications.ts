"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const LINQ_API_BASE = "https://api.linqapp.com/api/partner/v3";

async function linqPost(
  apiKey: string,
  path: string,
  body: unknown,
): Promise<unknown> {
  const res = await fetch(`${LINQ_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Linq POST ${path} failed (${res.status}): ${text}`);
  }
  return await res.json();
}

function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export const sendFeedbackUpdate = internalAction({
  args: {
    id: v.id("feedback"),
    kind: v.union(v.literal("merged"), v.literal("failed")),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const apiKey = process.env.LINQ_API_KEY;
    const fromNumber = process.env.LINQ_FROM_NUMBER;
    if (!apiKey || !fromNumber) {
      console.warn(
        "sendFeedbackUpdate: missing LINQ_API_KEY or LINQ_FROM_NUMBER, skipping",
      );
      return null;
    }

    const ctxRow = await ctx.runQuery(internal.feedback._getNotifyContext, {
      id: args.id,
    });
    if (ctxRow === null) {
      console.warn("sendFeedbackUpdate: feedback not found", args.id);
      return null;
    }
    if (ctxRow.notifyPhone === undefined || ctxRow.notifyPhone.length === 0) {
      return null;
    }

    const phone = ctxRow.notifyPhone;
    const title = truncate(ctxRow.title, 80);

    const message =
      args.kind === "merged"
        ? `Good news — we just shipped your request: "${title}". Thanks for the feedback!`
        : `We weren't able to ship your request ("${title}") this time, but it's on our radar. Thanks for letting us know!`;

    try {
      await linqPost(apiKey, "/chats", {
        from: fromNumber,
        to: [phone],
        message: {
          parts: [{ type: "text", value: message }],
          preferred_service: "iMessage",
          idempotency_key: `${args.id}-${args.kind}`,
        },
      });
    } catch (err) {
      console.error(
        "sendFeedbackUpdate: Linq send failed",
        err instanceof Error ? err.message : String(err),
      );
    }

    return null;
  },
});
