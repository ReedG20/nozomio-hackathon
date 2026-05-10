import { v } from "convex/values";
import { UserIdentity } from "convex/server";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";

export async function requireIdentity(
  ctx: QueryCtx,
): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }
  return identity;
}

export async function getCurrentUser(
  ctx: QueryCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_workosId", (q) => q.eq("workosId", identity.subject))
    .unique();
  return user;
}

type ProfileOverrides = {
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
};

function buildUserPatch(
  identity: UserIdentity,
  overrides: ProfileOverrides = {},
) {
  const overrideFullName = [overrides.firstName, overrides.lastName]
    .filter((p): p is string => Boolean(p && p.trim().length > 0))
    .join(" ")
    .trim();

  const identityFullName = [identity.givenName, identity.familyName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const email =
    overrides.email && overrides.email.length > 0
      ? overrides.email
      : (identity.email ?? "");

  const candidateName =
    (overrideFullName.length > 0 ? overrideFullName : null) ??
    identity.name ??
    (identityFullName.length > 0 ? identityFullName : null) ??
    (email.length > 0 ? email : null);

  const pictureUrl =
    overrides.profilePictureUrl ?? identity.pictureUrl ?? undefined;

  return {
    workosId: identity.subject,
    email,
    name:
      candidateName && candidateName.length > 0 ? candidateName : undefined,
    pictureUrl: pictureUrl ?? undefined,
  };
}

export async function ensureCurrentUser(
  ctx: MutationCtx,
  overrides: ProfileOverrides = {},
): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx);
  const existing = await ctx.db
    .query("users")
    .withIndex("by_workosId", (q) => q.eq("workosId", identity.subject))
    .unique();

  const patch = buildUserPatch(identity, overrides);

  if (existing === null) {
    const id = await ctx.db.insert("users", patch);
    const created = await ctx.db.get(id);
    if (created === null) {
      throw new Error("Failed to create user");
    }
    return created;
  }

  if (
    existing.email !== patch.email ||
    existing.name !== patch.name ||
    existing.pictureUrl !== patch.pictureUrl
  ) {
    await ctx.db.patch(existing._id, patch);
    return { ...existing, ...patch };
  }
  return existing;
}

const userValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  workosId: v.string(),
  email: v.string(),
  name: v.optional(v.string()),
  pictureUrl: v.optional(v.string()),
});

export const current = query({
  args: {},
  returns: v.union(userValidator, v.null()),
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const list = query({
  args: {},
  returns: v.array(userValidator),
  handler: async (ctx) => {
    await requireIdentity(ctx);
    return await ctx.db.query("users").collect();
  },
});

export const ensureCurrent = mutation({
  args: {
    profile: v.optional(
      v.object({
        email: v.optional(v.string()),
        firstName: v.optional(v.union(v.string(), v.null())),
        lastName: v.optional(v.union(v.string(), v.null())),
        profilePictureUrl: v.optional(v.union(v.string(), v.null())),
      }),
    ),
  },
  returns: v.id("users"),
  handler: async (ctx, args): Promise<Id<"users">> => {
    const user = await ensureCurrentUser(ctx, args.profile ?? {});
    return user._id;
  },
});
