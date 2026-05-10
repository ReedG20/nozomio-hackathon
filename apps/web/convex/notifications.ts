"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const LINQ_API_BASE = "https://api.linqapp.com/api/partner/v3";

type LinqCreateChatResponse = {
  chat?: { id?: string };
  chat_id?: string;
  id?: string;
};

function extractChatId(raw: unknown): string | null {
  if (raw === null || typeof raw !== "object") return null;
  const obj = raw as LinqCreateChatResponse;
  if (typeof obj.chat_id === "string" && obj.chat_id.length > 0) {
    return obj.chat_id;
  }
  if (typeof obj.id === "string" && obj.id.length > 0) {
    return obj.id;
  }
  if (
    obj.chat !== undefined &&
    obj.chat !== null &&
    typeof obj.chat.id === "string" &&
    obj.chat.id.length > 0
  ) {
    return obj.chat.id;
  }
  return null;
}

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
    kind: v.union(v.literal("succeeded"), v.literal("failed")),
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

    try {
      if (args.kind === "succeeded") {
        const prUrl = ctxRow.prUrl;
        const created = await linqPost(apiKey, "/chats", {
          from: fromNumber,
          to: [phone],
          message: {
            parts: [
              {
                type: "text",
                value: `Your feedback fix for "${title}" is ready!`,
              },
            ],
            preferred_service: "iMessage",
            idempotency_key: `${args.id}-1`,
          },
        });
        if (prUrl !== undefined && prUrl.length > 0) {
          const chatId = extractChatId(created);
          if (chatId === null) {
            console.warn(
              "sendFeedbackUpdate: could not extract chat id from Linq response",
              created,
            );
          } else {
            await linqPost(
              apiKey,
              `/chats/${encodeURIComponent(chatId)}/messages`,
              {
                message: {
                  parts: [{ type: "link", value: prUrl }],
                  preferred_service: "iMessage",
                  idempotency_key: `${args.id}-2`,
                },
              },
            );
          }
        }
      } else {
        const reason = truncate(args.reason ?? "Unknown error", 200);
        await linqPost(apiKey, "/chats", {
          from: fromNumber,
          to: [phone],
          message: {
            parts: [
              {
                type: "text",
                value: `Your feedback fix for "${title}" didn't go through: ${reason}`,
              },
            ],
            preferred_service: "iMessage",
            idempotency_key: `${args.id}-fail`,
          },
        });
      }
    } catch (err) {
      console.error(
        "sendFeedbackUpdate: Linq send failed",
        err instanceof Error ? err.message : String(err),
      );
    }

    return null;
  },
});
