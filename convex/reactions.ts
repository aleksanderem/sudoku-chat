import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./_helpers/auth";

export const toggle = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_messageAndUser", (q) =>
        q.eq("messageId", args.messageId).eq("userId", user._id)
      )
      .collect();

    const existingReaction = existing.find((r) => r.emoji === args.emoji);

    if (existingReaction) {
      await ctx.db.delete(existingReaction._id);
    } else {
      await ctx.db.insert("reactions", {
        messageId: args.messageId,
        userId: user._id,
        emoji: args.emoji,
        createdAt: Date.now(),
      });

      // Create notification for message sender
      const message = await ctx.db.get(args.messageId);
      if (message && message.senderId !== user._id) {
        await ctx.db.insert("notifications", {
          userId: message.senderId,
          type: "reaction",
          conversationId: message.conversationId,
          messageId: args.messageId,
          fromUserId: user._id,
          disguisedTitle: "Someone beat your time! ⏱️",
          disguisedBody: "Check the leaderboard",
          realTitle: `${user.name ?? "Someone"} reacted ${args.emoji}`,
          realBody: message.content.slice(0, 50),
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }
  },
});
