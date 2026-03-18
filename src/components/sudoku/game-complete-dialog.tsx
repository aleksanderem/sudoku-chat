import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartyPopper } from "lucide-react";
import type { Difficulty } from "@/lib/sudoku/types";

interface GameCompleteDialogProps {
  timer: number;
  difficulty: Difficulty;
  onNewGame: (difficulty: Difficulty) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function GameCompleteDialog({
  timer,
  difficulty,
  onNewGame,
}: GameCompleteDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-sm animate-in fade-in zoom-in-95">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <PartyPopper className="h-12 w-12 text-primary" />
          </div>
          <CardTitle>Puzzle Complete!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold tabular-nums">{formatTime(timer)}</p>
            <p className="text-sm text-muted-foreground capitalize">
              {difficulty} difficulty
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => onNewGame(difficulty)}>
              Play Again
            </Button>
            <Button variant="outline" onClick={() => onNewGame("hard")}>
              Try Harder
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
