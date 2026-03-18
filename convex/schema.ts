import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export const conversationTypeValidator = v.union(
  v.literal("direct"),
  v.literal("group")
);
export type ConversationType = "direct" | "group";

export const memberRoleValidator = v.union(
  v.literal("admin"),
  v.literal("member")
);
export type MemberRole = "admin" | "member";

export const messageTypeValidator = v.union(
  v.literal("text"),
  v.literal("image"),
  v.literal("file"),
  v.literal("system")
);
export type MessageType = "text" | "image" | "file" | "system";

export default defineSchema({
  ...authTables,

  users: defineTable({
    // Auth fields (managed by @convex-dev/auth)
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    // App-specific fields
    friendCode: v.optional(v.string()),
    secretSequenceHash: v.optional(v.string()),
    secretSequenceLength: v.optional(v.number()),
    avatarStorageId: v.optional(v.id("_storage")),
    lastSeenAt: v.optional(v.number()),
    isOnline: v.optional(v.boolean()),
    // Chat access: only users who register directly get chat.
    // Users from "Share Game" link get game-only mode.
    chatEnabled: v.optional(v.boolean()),
  })
    .index("by_friendCode", ["friendCode"])
    .index("email", ["email"]),

  // 1v1 challenge matches
  challenges: defineTable({
    challengerId: v.id("users"),
    opponentId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("declined")
    ),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    // Both players get the same puzzle
    puzzle: v.string(), // JSON serialized 9x9 grid
    solution: v.string(), // JSON serialized solution
    // Results
    challengerTime: v.optional(v.number()),
    challengerErrors: v.optional(v.number()),
    opponentTime: v.optional(v.number()),
    opponentErrors: v.optional(v.number()),
    winnerId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_challenger", ["challengerId", "status"])
    .index("by_opponent", ["opponentId", "status"])
    .index("by_status", ["status"]),

  // Leaderboard scores
  scores: defineTable({
    userId: v.id("users"),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    time: v.number(), // seconds
    errors: v.number(),
    // Lower = better: time + errors * 30s penalty
    score: v.number(),
    createdAt: v.number(),
  })
    .index("by_difficulty_score", ["difficulty", "score"])
    .index("by_user", ["userId"]),

  conversations: defineTable({
    type: conversationTypeValidator,
    name: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastMessageAt: v.optional(v.number()),
    // Auto-delete TTL in ms. Default 12h (43200000), max 12h. 0 = use default.
    messageTtlMs: v.optional(v.number()),
  }).index("by_lastMessage", ["lastMessageAt"]),

  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: memberRoleValidator,
    joinedAt: v.number(),
    lastReadAt: v.optional(v.number()),
    isRemoved: v.boolean(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_convAndUser", ["conversationId", "userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    type: messageTypeValidator,
    content: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    replyToId: v.optional(v.id("messages")),
    isEdited: v.boolean(),
    isDeleted: v.boolean(),
    // Auto-delete: when this message should be purged
    expiresAt: v.optional(v.number()),
    // View-limited media: how many times the image can be opened
    maxViews: v.optional(v.number()),
    viewCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_expiry", ["expiresAt"])
    .searchIndex("search_messages", {
      searchField: "content",
      filterFields: ["conversationId"],
    }),

  reactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_messageAndUser", ["messageId", "userId"]),

  typingIndicators: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    expiresAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_expiry", ["expiresAt"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    conversationId: v.optional(v.id("conversations")),
    messageId: v.optional(v.id("messages")),
    fromUserId: v.optional(v.id("users")),
    disguisedTitle: v.string(),
    disguisedBody: v.string(),
    realTitle: v.string(),
    realBody: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_userAndRead", ["userId", "isRead"]),

  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),
});
