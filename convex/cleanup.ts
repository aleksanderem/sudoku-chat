import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const BATCH_SIZE = 100;

// Purge expired messages - called by cron every 5 minutes
export const purgeExpiredMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Use index range to skip undefined expiresAt and only get expired ones
    // Index by_expiry sorts: undefined first, then by timestamp ascending
    // gt(0) skips undefined, lte(now) gets only expired messages
    const expired = await ctx.db
      .query("messages")
      .withIndex("by_expiry", (q) => q.gt("expiresAt", 0).lte("expiresAt", now))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .take(BATCH_SIZE);

    let purged = 0;
    for (const msg of expired) {
      if (msg.fileStorageId) {
        try {
          await ctx.storage.delete(msg.fileStorageId);
        } catch {
          // File may already be deleted
        }
      }

      await ctx.db.patch(msg._id, {
        isDeleted: true,
        content: "",
        fileStorageId: undefined,
        fileName: undefined,
        updatedAt: now,
      });
      purged++;
    }

    if (purged > 0) {
      console.log(`Purged ${purged} expired messages`);
    }
  },
});

// Clean up a view-limited message after the last view was shown
export const expireViewLimitedMessage = internalMutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.isDeleted) return;

    if (msg.maxViews !== undefined && msg.viewCount !== undefined && msg.viewCount >= msg.maxViews) {
      if (msg.fileStorageId) {
        try {
          await ctx.storage.delete(msg.fileStorageId);
        } catch {
          // Already deleted
        }
      }
      await ctx.db.patch(args.messageId, {
        fileStorageId: undefined,
        content: "View-limited photo expired",
        updatedAt: Date.now(),
      });
    }
  },
});
