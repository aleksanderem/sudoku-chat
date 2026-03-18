import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Undo2, Eraser, Lightbulb, PenLine, RotateCcw } from "lucide-react";
import type { Difficulty } from "@/lib/sudoku/types";

interface SudokuControlsProps {
  selectedCell: [number, number] | null;
  notesMode: boolean;
  hintsRemaining: number;
  canUndo: boolean;
  onNumberPress: (n: number) => void;
  onNotesToggle: () => void;
  onUndo: () => void;
  onErase: () => void;
  onHint: () => void;
  onNewGame: (difficulty: Difficulty) => void;
  difficulty: Difficulty;
}

export function SudokuControls({
  selectedCell,
  notesMode,
  hintsRemaining,
  canUndo,
  onNumberPress,
  onNotesToggle,
  onUndo,
  onErase,
  onHint,
  onNewGame,
  difficulty,
}: SudokuControlsProps) {
  return (
    <div className="space-y-4">
      {/* Number pad */}
      <div className="grid grid-cols-9 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <Button
            key={n}
            variant="outline"
            size="sm"
            className="h-11 text-base font-semibold"
            onClick={() => onNumberPress(n)}
            disabled={!selectedCell}
          >
            {n}
          </Button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-auto py-2"
          onClick={onUndo}
          disabled={!canUndo}
        >
          <Undo2 className="h-5 w-5" />
          <span className="text-[10px]">Undo</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-auto py-2"
          onClick={onErase}
          disabled={!selectedCell}
        >
          <Eraser className="h-5 w-5" />
          <span className="text-[10px]">Erase</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex-col gap-0.5 h-auto py-2",
            notesMode && "bg-primary/10 text-primary"
          )}
          onClick={onNotesToggle}
        >
          <PenLine className="h-5 w-5" />
          <span className="text-[10px]">Notes</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-auto py-2"
          onClick={onHint}
          disabled={hintsRemaining <= 0 || !selectedCell}
        >
          <Lightbulb className="h-5 w-5" />
          <span className="text-[10px]">Hint ({hintsRemaining})</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0.5 h-auto py-2"
          onClick={() => onNewGame(difficulty)}
        >
          <RotateCcw className="h-5 w-5" />
          <span className="text-[10px]">New</span>
        </Button>
      </div>

      {/* Difficulty selector */}
      <div className="flex items-center justify-center gap-2">
        {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
          <Button
            key={d}
            variant={d === difficulty ? "default" : "outline"}
            size="sm"
            className="capitalize text-xs"
            onClick={() => onNewGame(d)}
          >
            {d}
          </Button>
        ))}
      </div>
    </div>
  );
}
