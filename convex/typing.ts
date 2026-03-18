import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./_helpers/auth";

export const setTyping = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const expiresAt = Date.now() + 3000; // 3 seconds

    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) => q.eq(q.field("userId"), user._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { expiresAt });
    } else {
      await ctx.db.insert("typingIndicators", {
        conversationId: args.conversationId,
        userId: user._id,
        expiresAt,
      });
    }
  },
});

export const getTyping = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    const indicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const active = indicators.filter(
      (i) => i.expiresAt > now && i.userId !== user._id
    );

    const users = await Promise.all(
      active.map(async (i) => {
        const u = await ctx.db.get(i.userId);
        return u ? { _id: u._id, name: u.name } : null;
      })
    );

    return users.filter(Boolean);
  },
});
