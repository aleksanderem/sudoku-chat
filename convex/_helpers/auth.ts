import { QueryCtx, MutationCtx } from "../_generated/server";
import { auth } from "../auth";

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const userId = await auth.getUserId(ctx);
  if (!userId) return null;
  const user = await ctx.db.get(userId);
  return user;
}

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated");
  return user;
}
