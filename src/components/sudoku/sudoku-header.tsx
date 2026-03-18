import { Timer, Trophy } from "lucide-react";
import type { Difficulty } from "@/lib/sudoku/types";
import { cn } from "@/lib/utils";

interface SudokuHeaderProps {
  timer: number;
  difficulty: Difficulty;
  isRunning: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const difficultyColors: Record<Difficulty, string> = {
  easy: "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400",
  medium: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400",
  hard: "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400",
};

export function SudokuHeader({ timer, difficulty, isRunning }: SudokuHeaderProps) {
  return (
    <div className="flex w-full max-w-md items-center justify-between">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold">Sudoku</span>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "rounded-full px-3 py-0.5 text-xs font-medium capitalize",
            difficultyColors[difficulty]
          )}
        >
          {difficulty}
        </span>

        <div className="flex items-center gap-1 text-sm text-muted-foreground tabular-nums">
          <Timer className="h-4 w-4" />
          <span className={cn(!isRunning && "opacity-50")}>
            {formatTime(timer)}
          </span>
        </div>
      </div>
    </div>
  );
}
