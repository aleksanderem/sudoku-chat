import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./_helpers/auth";
import { conversationTypeValidator } from "./schema";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    // Get all conversation memberships for this user
    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const activeMembers = memberships.filter((m) => !m.isRemoved);

    // Fetch conversations with last message and unread count
    const conversations = await Promise.all(
      activeMembers.map(async (membership) => {
        const conversation = await ctx.db.get(membership.conversationId);
        if (!conversation) return null;

        // Get last message
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conversation._id)
          )
          .order("desc")
          .take(1);
        const lastMessage = messages[0] ?? null;

        // Count unread messages
        const lastReadAt = membership.lastReadAt ?? 0;
        const unreadMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conversation._id)
          )
          .filter((q) => q.gt(q.field("createdAt"), lastReadAt))
          .collect();
        const unreadCount = unreadMessages.filter(
          (m) => m.senderId !== user._id && !m.isDeleted
        ).length;

        // Get members for display
        const allMembers = await ctx.db
          .query("conversationMembers")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conversation._id)
          )
          .filter((q) => q.eq(q.field("isRemoved"), false))
          .collect();

        const memberUsers = await Promise.all(
          allMembers
            .filter((m) => m.userId !== user._id)
            .map(async (m) => {
              const u = await ctx.db.get(m.userId);
              return u
                ? { _id: u._id, name: u.name, isOnline: u.isOnline }
                : null;
            })
        );

        // For DMs, use the other person's name
        const displayName =
          conversation.type === "direct"
            ? memberUsers[0]?.name ?? "Unknown"
            : conversation.name ?? "Group";

        const isOnline =
          conversation.type === "direct"
            ? memberUsers[0]?.isOnline ?? false
            : false;

        return {
          ...conversation,
          displayName,
          isOnline,
          lastMessage: lastMessage
            ? {
                content: lastMessage.isDeleted
                  ? "Message deleted"
                  : lastMessage.content,
                senderId: lastMessage.senderId,
                createdAt: lastMessage.createdAt,
                type: lastMessage.type,
              }
            : null,
          unreadCount,
          memberCount: allMembers.length,
        };
      })
    );

    return conversations
      .filter(Boolean)
      .sort(
        (a, b) =>
          (b!.lastMessage?.createdAt ?? b!.createdAt) -
          (a!.lastMessage?.createdAt ?? a!.createdAt)
      );
  },
});

export const getById = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_convAndUser", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.isRemoved) {
      throw new Error("Not a member of this conversation");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const members = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) => q.eq(q.field("isRemoved"), false))
      .collect();

    const memberUsers = await Promise.all(
      members.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return u
          ? {
              _id: u._id,
              name: u.name,
              isOnline: u.isOnline,
              lastSeenAt: u.lastSeenAt,
              role: m.role,
            }
          : null;
      })
    );

    return {
      ...conversation,
      members: memberUsers.filter(Boolean),
    };
  },
});

export const createDirect = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.userId === user._id) throw new Error("Cannot chat with yourself");

    // Check if DM already exists
    const myMemberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isRemoved"), false))
      .collect();

    for (const membership of myMemberships) {
      const conv = await ctx.db.get(membership.conversationId);
      if (conv?.type !== "direct") continue;

      const otherMember = await ctx.db
        .query("conversationMembers")
        .withIndex("by_convAndUser", (q) =>
          q.eq("conversationId", conv._id).eq("userId", args.userId)
        )
        .unique();

      if (otherMember && !otherMember.isRemoved) {
        return conv._id; // DM already exists
      }
    }

    // Create new DM
    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      type: "direct",
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: user._id,
      role: "admin",
      joinedAt: now,
      isRemoved: false,
    });

    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: args.userId,
      role: "admin",
      joinedAt: now,
      isRemoved: false,
    });

    return conversationId;
  },
});

export const createGroup = mutation({
  args: {
    name: v.string(),
    memberIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    const conversationId = await ctx.db.insert("conversations", {
      type: "group",
      name: args.name,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    // Add creator as admin
    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: user._id,
      role: "admin",
      joinedAt: now,
      isRemoved: false,
    });

    // Add other members
    for (const memberId of args.memberIds) {
      if (memberId === user._id) continue;
      await ctx.db.insert("conversationMembers", {
        conversationId,
        userId: memberId,
        role: "member",
        joinedAt: now,
        isRemoved: false,
      });
    }

    // System message
    await ctx.db.insert("messages", {
      conversationId,
      senderId: user._id,
      type: "system",
      content: `${user.name ?? "Someone"} created the group "${args.name}"`,
      isEdited: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    return conversationId;
  },
});

export const addMember = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    // Verify requester is admin
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_convAndUser", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role !== "admin")
      throw new Error("Admin access required");

    // Check if already a member
    const existing = await ctx.db
      .query("conversationMembers")
      .withIndex("by_convAndUser", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", args.userId)
      )
      .unique();

    if (existing && !existing.isRemoved) {
      throw new Error("Already a member");
    }

    if (existing) {
      await ctx.db.patch(existing._id, { isRemoved: false, joinedAt: now });
    } else {
      await ctx.db.insert("conversationMembers", {
        conversationId: args.conversationId,
        userId: args.userId,
        role: "member",
        joinedAt: now,
        isRemoved: false,
      });
    }

    const newUser = await ctx.db.get(args.userId);
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: user._id,
      type: "system",
      content: `${user.name} added ${newUser?.name ?? "someone"}`,
      isEdited: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const leave = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_convAndUser", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new Error("Not a member");
    await ctx.db.patch(membership._id, { isRemoved: true });

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: user._id,
      type: "system",
      content: `${user.name ?? "Someone"} left the group`,
      isEdited: false,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
