import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const BATCH_SIZE = 100;

// Purge expired messages - called by cron every 5 minutes
export const purgeExpiredMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find messages past their expiry
    const expired = await ctx.db
      .query("messages")
      .withIndex("by_expiry")
      .filter((q) =>
        q.and(
          q.neq(q.field("expiresAt"), undefined),
          q.lte(q.field("expiresAt"), now),
          q.eq(q.field("isDeleted"), false)
        )
      )
      .take(BATCH_SIZE);

    for (const msg of expired) {
      // Delete attached file from storage
      if (msg.fileStorageId) {
        try {
          await ctx.storage.delete(msg.fileStorageId);
        } catch {
          // File may already be deleted
        }
      }

      // Soft-delete the message
      await ctx.db.patch(msg._id, {
        isDeleted: true,
        content: "",
        fileStorageId: undefined,
        fileName: undefined,
        updatedAt: now,
      });
    }

    if (expired.length > 0) {
      console.log(`Purged ${expired.length} expired messages`);
    }
  },
});

// Clean up a view-limited message after the last view was shown
export const expireViewLimitedMessage = internalMutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.isDeleted) return;

    // Only expire if all views are used
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
