import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./_helpers/auth";
import { messageTypeValidator } from "./schema";

const DISGUISED_NOTIFICATIONS: Record<string, { title: string; body: string }[]> = {
  direct: [
    { title: "New daily puzzle available!", body: "A fresh challenge awaits you" },
    { title: "Daily streak reminder", body: "Keep your streak going!" },
    { title: "Puzzle of the day", body: "New brain teaser ready" },
  ],
  group: [
    { title: "Your puzzle streak continues! 🔥", body: "Keep up the momentum" },
    { title: "Leaderboard updated", body: "Check your ranking" },
    { title: "Community challenge", body: "New group puzzle available" },
  ],
};

function getRandomDisguise(type: "direct" | "group") {
  const options = DISGUISED_NOTIFICATIONS[type];
  return options[Math.floor(Math.random() * options.length)];
}

export const list = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Verify membership
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_convAndUser", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.isRemoved) {
      throw new Error("Not a member");
    }

    const limit = args.limit ?? 50;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .take(limit);

    // Enrich with sender info and reactions
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_message", (q) => q.eq("messageId", msg._id))
          .collect();

        // Group reactions by emoji
        const reactionGroups: Record<string, { emoji: string; count: number; userIds: string[] }> = {};
        for (const r of reactions) {
          if (!reactionGroups[r.emoji]) {
            reactionGroups[r.emoji] = { emoji: r.emoji, count: 0, userIds: [] };
          }
          reactionGroups[r.emoji].count++;
          reactionGroups[r.emoji].userIds.push(r.userId);
        }

        // Get reply-to message if exists
        let replyTo = null;
        if (msg.replyToId) {
          const replyMsg = await ctx.db.get(msg.replyToId);
          if (replyMsg) {
            const replySender = await ctx.db.get(replyMsg.senderId);
            replyTo = {
              _id: replyMsg._id,
              content: replyMsg.isDeleted ? "Message deleted" : replyMsg.content,
              senderName: replySender?.name ?? "Unknown",
            };
          }
        }

        // Get file URL if applicable (NOT for view-limited media)
        let fileUrl = null;
        const isViewLimited = msg.maxViews !== undefined && msg.maxViews > 0;
        if (msg.fileStorageId && !isViewLimited) {
          fileUrl = await ctx.storage.getUrl(msg.fileStorageId);
        }

        return {
          ...msg,
          senderName: sender?.name ?? "Unknown",
          senderIsOnline: sender?.isOnline ?? false,
          reactions: Object.values(reactionGroups),
          replyTo,
          fileUrl,
        };
      })
    );

    return enriched.reverse(); // Return in chronological order
  },
});

const MAX_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const DEFAULT_TTL_MS = MAX_TTL_MS;

export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    type: messageTypeValidator,
    fileStorageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    replyToId: v.optional(v.id("messages")),
    maxViews: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    // Verify membership
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_convAndUser", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.isRemoved) {
      throw new Error("Not a member");
    }

    // Calculate expiry based on conversation TTL
    const conversation = await ctx.db.get(args.conversationId);
    const ttl = Math.min(conversation?.messageTtlMs || DEFAULT_TTL_MS, MAX_TTL_MS);
    const expiresAt = now + ttl;

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: user._id,
      type: args.type,
      content: args.content,
      fileStorageId: args.fileStorageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      replyToId: args.replyToId,
      isEdited: false,
      isDeleted: false,
      expiresAt,
      maxViews: args.maxViews,
      viewCount: args.maxViews !== undefined ? 0 : undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Update conversation lastMessageAt
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      updatedAt: now,
    });

    // Update sender's lastReadAt
    await ctx.db.patch(membership._id, { lastReadAt: now });

    // Create notifications for other members
    const members = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) => q.eq(q.field("isRemoved"), false))
      .collect();

    const convType = conversation?.type === "group" ? "group" : "direct";
    const disguise = getRandomDisguise(convType);

    for (const member of members) {
      if (member.userId === user._id) continue;

      await ctx.db.insert("notifications", {
        userId: member.userId,
        type: "new_message",
        conversationId: args.conversationId,
        messageId,
        fromUserId: user._id,
        disguisedTitle: disguise.title,
        disguisedBody: disguise.body,
        realTitle: `${user.name ?? "Someone"}`,
        realBody: args.type === "text" ? args.content.slice(0, 100) : `Sent a ${args.type}`,
        isRead: false,
        createdAt: now,
      });

      // Schedule push notification (runs as Node.js action)
      await ctx.scheduler.runAfter(0, internal.pushActions.sendPush, {
        userId: member.userId,
        title: disguise.title,
        body: disguise.body,
      });
    }

    return messageId;
  },
});

export const edit = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== user._id) throw new Error("Can only edit own messages");

    await ctx.db.patch(args.messageId, {
      content: args.content,
      isEdited: true,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== user._id) throw new Error("Can only delete own messages");

    await ctx.db.patch(args.messageId, {
      isDeleted: true,
      content: "",
      updatedAt: Date.now(),
    });
  },
});

export const markRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_convAndUser", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) return;
    await ctx.db.patch(membership._id, { lastReadAt: Date.now() });

    // Mark related notifications as read
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userAndRead", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    for (const n of unread) {
      if (n.conversationId === args.conversationId) {
        await ctx.db.patch(n._id, { isRead: true });
      }
    }
  },
});

export const search = query({
  args: {
    conversationId: v.id("conversations"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_convAndUser", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.isRemoved) return [];

    const results = await ctx.db
      .query("messages")
      .withSearchIndex("search_messages", (q) =>
        q.search("content", args.query).eq("conversationId", args.conversationId)
      )
      .take(20);

    return results.filter((m) => !m.isDeleted);
  },
});

// Open a view-limited image. Increments viewCount. Returns the file URL
// only if views remain, otherwise returns null.
export const openViewLimited = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.isDeleted) return null;

    // Verify user is in the conversation
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_convAndUser", (q) =>
        q.eq("conversationId", msg.conversationId).eq("userId", user._id)
      )
      .unique();
    if (!membership || membership.isRemoved) return null;

    if (msg.maxViews === undefined || msg.viewCount === undefined) {
      // Not view-limited, return URL directly
      return msg.fileStorageId ? await ctx.storage.getUrl(msg.fileStorageId) : null;
    }

    if (msg.viewCount >= msg.maxViews) {
      // All views used up
      return null;
    }

    // Increment view count
    const newCount = msg.viewCount + 1;
    await ctx.db.patch(args.messageId, { viewCount: newCount });

    // If this was the last view, delete the file from storage
    if (newCount >= msg.maxViews && msg.fileStorageId) {
      await ctx.db.patch(args.messageId, {
        fileStorageId: undefined,
        content: "View-limited photo expired",
      });
      try {
        await ctx.storage.delete(msg.fileStorageId);
      } catch {
        // Already deleted
      }
    }

    return msg.fileStorageId ? await ctx.storage.getUrl(msg.fileStorageId) : null;
  },
});
