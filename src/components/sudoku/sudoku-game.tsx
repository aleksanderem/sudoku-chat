import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import { useSudokuGame } from "@/hooks/use-sudoku-game";
import { useSequenceDetector } from "@/hooks/use-sequence-detector";
import { SudokuBoard } from "./sudoku-board";
import { SudokuControls } from "./sudoku-controls";
import { SudokuHeader } from "./sudoku-header";
import { GameCompleteDialog } from "./game-complete-dialog";
import { ChallengeTab, LeaderboardTab } from "./multiplayer-panel";
import { cn } from "@/lib/utils";
import { Grid3X3, Swords, Trophy } from "lucide-react";

type GameTab = "play" | "challenge" | "leaderboard";

interface SudokuGameProps {
  onEnterChat?: () => void;
}

export function SudokuGame({ onEnterChat }: SudokuGameProps) {
  const user = useQuery(api.users.me);
  const game = useSudokuGame();
  const submitScore = useMutation(api.leaderboard.submitScore);
  const [activeTab, setActiveTab] = useState<GameTab>("play");
  const sequenceLength = onEnterChat ? (user?.secretSequenceLength ?? 0) : 0;

  const { onCellEntry } = useSequenceDetector({
    sequenceLength,
    board: game.board,
    eraseCells: game.eraseCells,
    onMatch: onEnterChat ?? (() => {}),
  });

  function handleCellValueChange(row: number, col: number, value: number) {
    if (game.notesMode && value !== 0) {
      game.toggleNote(row, col, value);
    } else {
      if (onEnterChat) {
        onCellEntry(row, col, value);
      }
      game.setCellValue(row, col, value);
      advanceToNextEmpty(row, col);
    }
  }

  function advanceToNextEmpty(fromRow: number, fromCol: number) {
    for (let i = fromRow * 9 + fromCol + 1; i < 81; i++) {
      const r = Math.floor(i / 9);
      const c = i % 9;
      if (!game.board[r][c].isGiven && game.board[r][c].value === 0) {
        game.setSelectedCell([r, c]);
        return;
      }
    }
    for (let i = 0; i < fromRow * 9 + fromCol; i++) {
      const r = Math.floor(i / 9);
      const c = i % 9;
      if (!game.board[r][c].isGiven && game.board[r][c].value === 0) {
        game.setSelectedCell([r, c]);
        return;
      }
    }
  }

  // Auto-submit score when puzzle completed
  if (game.isComplete) {
    // Count errors (cells that were wrong at any point)
    const errorCount = game.board.flat().filter((c) => c.isError).length;
    submitScore({ difficulty: game.difficulty, time: game.timer, errors: errorCount });
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-4">
      {/* Top tabs */}
      <div className="w-full max-w-md flex bg-muted rounded-lg p-1 mb-4">
        {([
          { id: "play" as GameTab, label: "Single Player", icon: Grid3X3 },
          { id: "challenge" as GameTab, label: "Challenge", icon: Swords },
          { id: "leaderboard" as GameTab, label: "Leaderboard", icon: Trophy },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex-1 py-2 text-[11px] font-medium rounded-md transition-all flex items-center justify-center gap-1.5",
              activeTab === id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "play" && (
        <>
          <SudokuHeader
            timer={game.timer}
            difficulty={game.difficulty}
            isRunning={game.isRunning}
          />

          <div className="mt-4 w-full max-w-md">
            <SudokuBoard
              board={game.board}
              selectedCell={game.selectedCell}
              onSelectCell={game.setSelectedCell}
              onCellValueChange={handleCellValueChange}
            />
          </div>

          <div className="mt-4 w-full max-w-md">
            <SudokuControls
              selectedCell={game.selectedCell}
              notesMode={game.notesMode}
              hintsRemaining={game.hintsRemaining}
              canUndo={game.history.length > 0}
              onNumberPress={(n: number) => {
                if (game.selectedCell) {
                  handleCellValueChange(game.selectedCell[0], game.selectedCell[1], n);
                }
              }}
              onNotesToggle={() => game.setNotesMode(!game.notesMode)}
              onUndo={game.undo}
              onErase={game.erase}
              onHint={game.useHint}
              onNewGame={game.newGame}
              difficulty={game.difficulty}
              userEmail={user?.email}
            />
          </div>
        </>
      )}

      {activeTab === "challenge" && (
        <div className="w-full max-w-md">
          <ChallengeTab />
        </div>
      )}

      {activeTab === "leaderboard" && (
        <div className="w-full max-w-md">
          <LeaderboardTab />
        </div>
      )}

      {game.isComplete && (
        <GameCompleteDialog
          timer={game.timer}
          difficulty={game.difficulty}
          onNewGame={game.newGame}
        />
      )}
    </div>
  );
}
