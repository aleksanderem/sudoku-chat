import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./_helpers/auth";

const ERROR_PENALTY = 30; // 30 seconds per error

export const submitScore = mutation({
  args: {
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    time: v.number(),
    errors: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const score = args.time + args.errors * ERROR_PENALTY;

    await ctx.db.insert("scores", {
      userId: user._id,
      difficulty: args.difficulty,
      time: args.time,
      errors: args.errors,
      score,
      createdAt: Date.now(),
    });

    return score;
  },
});

export const getTopScores = query({
  args: {
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_difficulty_score", (q) => q.eq("difficulty", args.difficulty))
      .take(args.limit ?? 10);

    return Promise.all(
      scores.map(async (s) => {
        const user = await ctx.db.get(s.userId);
        return {
          ...s,
          userName: user?.name ?? "Unknown",
        };
      })
    );
  },
});

export const getMyBest = query({
  args: {
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const forDifficulty = scores
      .filter((s) => s.difficulty === args.difficulty)
      .sort((a, b) => a.score - b.score);

    return forDifficulty[0] ?? null;
  },
});
