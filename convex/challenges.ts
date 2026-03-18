import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./_helpers/auth";
// Inline puzzle generator (can't import from src/ in Convex runtime)
function generatePuzzleServer(difficulty: "easy" | "medium" | "hard") {
  // Simplified: generate a valid puzzle inline
  // In production, share the generator code via a shared package
  const cellsToRemove = { easy: 35, medium: 45, hard: 54 }[difficulty];

  function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function isValid(board: number[][], row: number, col: number, num: number): boolean {
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num || board[i][col] === num) return false;
    }
    const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++)
      for (let c = bc; c < bc + 3; c++)
        if (board[r][c] === num) return false;
    return true;
  }

  function fill(board: number[][]): boolean {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c] === 0) {
          for (const n of shuffleArray([1,2,3,4,5,6,7,8,9])) {
            if (isValid(board, r, c, n)) {
              board[r][c] = n;
              if (fill(board)) return true;
              board[r][c] = 0;
            }
          }
          return false;
        }
    return true;
  }

  const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
  fill(solution);

  const puzzle = solution.map(r => [...r]);
  const positions = shuffleArray(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number])
  );

  let removed = 0;
  for (const [r, c] of positions) {
    if (removed >= cellsToRemove) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    removed++; // Simplified: skip uniqueness check for speed in challenges
  }

  return { puzzle, solution };
}

export const create = mutation({
  args: {
    opponentId: v.id("users"),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.opponentId === user._id) throw new Error("Cannot challenge yourself");

    const { puzzle, solution } = generatePuzzleServer(args.difficulty);
    const now = Date.now();

    const id = await ctx.db.insert("challenges", {
      challengerId: user._id,
      opponentId: args.opponentId,
      status: "pending",
      difficulty: args.difficulty,
      puzzle: JSON.stringify(puzzle),
      solution: JSON.stringify(solution),
      createdAt: now,
      updatedAt: now,
    });

    // Notify opponent
    await ctx.db.insert("notifications", {
      userId: args.opponentId,
      type: "challenge",
      disguisedTitle: "New challenge unlocked! 🏆",
      disguisedBody: "Someone wants to compete with you",
      realTitle: `${user.name} challenged you!`,
      realBody: `${args.difficulty} difficulty - accept to play`,
      isRead: false,
      createdAt: now,
    });

    // Push notification
    await ctx.scheduler.runAfter(0, internal.pushActions.sendPush, {
      userId: args.opponentId,
      title: "New challenge unlocked! 🏆",
      body: "Someone wants to compete with you",
    });

    return id;
  },
});

export const respond = mutation({
  args: {
    challengeId: v.id("challenges"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");
    if (challenge.opponentId !== user._id) throw new Error("Not your challenge");
    if (challenge.status !== "pending") throw new Error("Challenge already responded to");

    await ctx.db.patch(args.challengeId, {
      status: args.accept ? "active" : "declined",
      updatedAt: Date.now(),
    });
  },
});

export const submitResult = mutation({
  args: {
    challengeId: v.id("challenges"),
    time: v.number(),
    errors: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");
    if (challenge.status !== "active") throw new Error("Challenge not active");

    const isChallenger = challenge.challengerId === user._id;
    const isOpponent = challenge.opponentId === user._id;
    if (!isChallenger && !isOpponent) throw new Error("Not part of this challenge");

    const update: Record<string, unknown> = { updatedAt: Date.now() };

    if (isChallenger) {
      if (challenge.challengerTime !== undefined) throw new Error("Already submitted");
      update.challengerTime = args.time;
      update.challengerErrors = args.errors;
    } else {
      if (challenge.opponentTime !== undefined) throw new Error("Already submitted");
      update.opponentTime = args.time;
      update.opponentErrors = args.errors;
    }

    await ctx.db.patch(args.challengeId, update);

    // Check if both finished
    const updatedChallenge = await ctx.db.get(args.challengeId);
    if (
      updatedChallenge &&
      updatedChallenge.challengerTime !== undefined &&
      updatedChallenge.opponentTime !== undefined
    ) {
      const cScore = updatedChallenge.challengerTime + (updatedChallenge.challengerErrors ?? 0) * 30;
      const oScore = updatedChallenge.opponentTime + (updatedChallenge.opponentErrors ?? 0) * 30;
      const winnerId = cScore <= oScore ? challenge.challengerId : challenge.opponentId;

      await ctx.db.patch(args.challengeId, {
        status: "completed",
        winnerId,
      });
    }
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const asChallenger = await ctx.db
      .query("challenges")
      .withIndex("by_challenger", (q) => q.eq("challengerId", user._id))
      .order("desc")
      .take(20);

    const asOpponent = await ctx.db
      .query("challenges")
      .withIndex("by_opponent", (q) => q.eq("opponentId", user._id))
      .order("desc")
      .take(20);

    const all = [...asChallenger, ...asOpponent]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);

    // Enrich with user names
    return Promise.all(
      all.map(async (c) => {
        const challenger = await ctx.db.get(c.challengerId);
        const opponent = await ctx.db.get(c.opponentId);
        return {
          ...c,
          challengerName: challenger?.name ?? "Unknown",
          opponentName: opponent?.name ?? "Unknown",
        };
      })
    );
  },
});

export const getById = query({
  args: { challengeId: v.id("challenges") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const c = await ctx.db.get(args.challengeId);
    if (!c) return null;
    if (c.challengerId !== user._id && c.opponentId !== user._id) return null;

    const challenger = await ctx.db.get(c.challengerId);
    const opponent = await ctx.db.get(c.opponentId);

    return {
      ...c,
      challengerName: challenger?.name ?? "Unknown",
      opponentName: opponent?.name ?? "Unknown",
    };
  },
});
