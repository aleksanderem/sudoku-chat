import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import type { Id } from "@cvx/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Swords, Trophy, Users, Loader2, Crown, Clock, AlertCircle } from "lucide-react";
import type { Difficulty } from "@/lib/sudoku/types";

function formatScore(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MultiplayerPanel() {
  const [tab, setTab] = useState<"challenge" | "leaderboard">("challenge");

  return (
    <div className="w-full max-w-md mt-4 space-y-3">
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        <button
          className={cn("flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1",
            tab === "challenge" ? "bg-background shadow-sm" : "text-muted-foreground")}
          onClick={() => setTab("challenge")}
        >
          <Swords className="h-3.5 w-3.5" /> Challenge
        </button>
        <button
          className={cn("flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1",
            tab === "leaderboard" ? "bg-background shadow-sm" : "text-muted-foreground")}
          onClick={() => setTab("leaderboard")}
        >
          <Trophy className="h-3.5 w-3.5" /> Leaderboard
        </button>
      </div>

      {tab === "challenge" ? <ChallengeTab /> : <LeaderboardTab />}
    </div>
  );
}

function ChallengeTab() {
  const [friendCode, setFriendCode] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [loading, setLoading] = useState(false);
  const challenges = useQuery(api.challenges.listMine);
  const user = useQuery(api.users.me);
  const foundUser = useQuery(
    api.users.findByFriendCode,
    friendCode.length === 8 ? { friendCode } : "skip"
  );
  const createChallenge = useMutation(api.challenges.create);
  const respondChallenge = useMutation(api.challenges.respond);

  async function handleChallenge() {
    if (!foundUser) return;
    setLoading(true);
    try {
      await createChallenge({ opponentId: foundUser._id, difficulty });
      toast.success("Challenge sent!");
      setFriendCode("");
    } catch (err) {
      toast.error("Failed to send challenge");
    } finally {
      setLoading(false);
    }
  }

  const pending = challenges?.filter(
    (c) => c.status === "pending" && c.opponentId === user?._id
  );

  return (
    <div className="space-y-3">
      {/* Create challenge */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Friend code"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value.toUpperCase().slice(0, 8))}
            className="uppercase tracking-widest text-xs h-9"
            maxLength={8}
          />
          <Button size="sm" className="h-9 text-xs" onClick={handleChallenge}
            disabled={loading || !foundUser}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Swords className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {foundUser && (
          <p className="text-xs text-muted-foreground">
            Challenge {foundUser.name}?
          </p>
        )}
        <div className="flex gap-1">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
            <button key={d} onClick={() => setDifficulty(d)}
              className={cn("flex-1 py-1 text-[10px] rounded capitalize transition-colors",
                d === difficulty ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent")}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Pending challenges */}
      {pending && pending.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Incoming</p>
          {pending.map((c) => (
            <div key={c._id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{c.challengerName}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{c.difficulty}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => respondChallenge({ challengeId: c._id, accept: false })}>
                  ✕
                </Button>
                <Button size="sm" className="h-7 text-xs"
                  onClick={() => respondChallenge({ challengeId: c._id, accept: true })}>
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent challenges */}
      {challenges && challenges.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Recent</p>
          {challenges.slice(0, 5).map((c) => {
            const isWinner = c.winnerId === user?._id;
            const isMe = c.challengerId === user?._id;
            const opName = isMe ? c.opponentName : c.challengerName;
            return (
              <div key={c._id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-1.5 text-xs">
                <div className="flex items-center gap-2">
                  {c.status === "completed" && isWinner && <Crown className="h-3.5 w-3.5 text-yellow-500" />}
                  {c.status === "completed" && !isWinner && <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                  {c.status === "active" && <Clock className="h-3.5 w-3.5 text-blue-500 animate-pulse" />}
                  {c.status === "pending" && <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span>{opName}</span>
                </div>
                <span className={cn("capitalize",
                  c.status === "completed" && isWinner && "text-green-500",
                  c.status === "completed" && !isWinner && "text-red-400",
                  c.status === "active" && "text-blue-500",
                  c.status === "pending" && "text-muted-foreground"
                )}>
                  {c.status === "completed" ? (isWinner ? "Won" : "Lost") : c.status}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Your code */}
      {user?.friendCode && (
        <p className="text-center text-[10px] text-muted-foreground">
          Your code: <span className="font-mono font-bold tracking-widest">{user.friendCode}</span>
        </p>
      )}
    </div>
  );
}

function LeaderboardTab() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const topScores = useQuery(api.leaderboard.getTopScores, { difficulty, limit: 10 });
  const myBest = useQuery(api.leaderboard.getMyBest, { difficulty });

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
          <button key={d} onClick={() => setDifficulty(d)}
            className={cn("flex-1 py-1 text-[10px] rounded capitalize transition-colors",
              d === difficulty ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent")}>
            {d}
          </button>
        ))}
      </div>

      {myBest && (
        <div className="rounded-lg bg-primary/10 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground">Your best</p>
          <p className="text-lg font-bold tabular-nums">{formatScore(myBest.time)}</p>
          <p className="text-[10px] text-muted-foreground">{myBest.errors} errors</p>
        </div>
      )}

      <div className="space-y-1">
        {topScores === undefined ? (
          <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
        ) : topScores.length === 0 ? (
          <p className="text-xs text-center text-muted-foreground py-4">No scores yet. Complete a puzzle!</p>
        ) : (
          topScores.map((s, i) => (
            <div key={s._id} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-1.5 text-xs">
              <span className={cn("font-bold w-5 text-center",
                i === 0 && "text-yellow-500",
                i === 1 && "text-gray-400",
                i === 2 && "text-amber-700"
              )}>
                {i + 1}
              </span>
              <span className="flex-1 truncate">{s.userName}</span>
              <span className="tabular-nums font-medium">{formatScore(s.time)}</span>
              <span className="text-muted-foreground w-8 text-right">{s.errors}err</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
