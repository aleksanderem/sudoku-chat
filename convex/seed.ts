import { internalMutation } from "./_generated/server";

// One-time seed: add example leaderboard entries
export const seedLeaderboard = internalMutation({
  args: {},
  handler: async (ctx) => {

    // Check if already seeded
    const existing = await ctx.db.query("scores").take(1);
    if (existing.length > 0) return "Already seeded";

    const names = [
      "SpeedRunner", "PuzzleMaster", "SudokuNinja", "BrainStorm",
      "GridWizard", "NumberCruncher", "LogicKing", "MindBender",
    ];

    const difficulties = ["easy", "medium", "hard"] as const;
    const now = Date.now();

    for (const name of names) {
      // Create a fake user for each
      const userId = await ctx.db.insert("users", {
        name,
        isOnline: false,
        lastSeenAt: now - Math.floor(Math.random() * 86400000),
        chatEnabled: false,
      });

      for (const diff of difficulties) {
        const baseTime = { easy: 120, medium: 300, hard: 600 }[diff];
        const time = baseTime + Math.floor(Math.random() * baseTime * 0.8);
        const errors = Math.floor(Math.random() * 5);
        const score = time + errors * 30;

        await ctx.db.insert("scores", {
          userId,
          difficulty: diff,
          time,
          errors,
          score,
          createdAt: now - Math.floor(Math.random() * 604800000),
        });
      }
    }

    return "Seeded!";
  },
});
