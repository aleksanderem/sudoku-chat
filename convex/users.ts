import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser, requireUser } from "./_helpers/auth";

function generateFriendCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const me = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const setupProfile = mutation({
  args: {
    name: v.string(),
    chatEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    let friendCode = generateFriendCode();
    // Ensure uniqueness
    let existing = await ctx.db
      .query("users")
      .withIndex("by_friendCode", (q) => q.eq("friendCode", friendCode))
      .unique();
    while (existing) {
      friendCode = generateFriendCode();
      existing = await ctx.db
        .query("users")
        .withIndex("by_friendCode", (q) => q.eq("friendCode", friendCode))
        .unique();
    }

    await ctx.db.patch(user._id, {
      name: args.name,
      friendCode,
      isOnline: true,
      lastSeenAt: Date.now(),
      chatEnabled: args.chatEnabled ?? true,
    });
  },
});

export const setSecretSequence = mutation({
  args: {
    hash: v.string(),
    length: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, {
      secretSequenceHash: args.hash,
      secretSequenceLength: args.length,
    });
  },
});

export const verifySecretSequence = mutation({
  args: {
    hash: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    return user.secretSequenceHash === args.hash;
  },
});

export const findByFriendCode = query({
  args: {
    friendCode: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_friendCode", (q) =>
        q.eq("friendCode", args.friendCode.toUpperCase())
      )
      .unique();
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      friendCode: user.friendCode,
      isOnline: user.isOnline,
      lastSeenAt: user.lastSeenAt,
    };
  },
});

export const heartbeat = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;
    await ctx.db.patch(user._id, {
      isOnline: true,
      lastSeenAt: Date.now(),
    });
  },
});
