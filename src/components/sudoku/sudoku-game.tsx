import { useQuery } from "convex/react";
import { api } from "@cvx/_generated/api";
import { useSudokuGame } from "@/hooks/use-sudoku-game";
import { useSequenceDetector } from "@/hooks/use-sequence-detector";
import { SudokuBoard } from "./sudoku-board";
import { SudokuControls } from "./sudoku-controls";
import { SudokuHeader } from "./sudoku-header";
import { GameCompleteDialog } from "./game-complete-dialog";
import { MultiplayerPanel } from "./multiplayer-panel";

interface SudokuGameProps {
  onEnterChat?: () => void;
}

export function SudokuGame({ onEnterChat }: SudokuGameProps) {
  const user = useQuery(api.users.me);
  const game = useSudokuGame();
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
    // Scan from current position forward (reading order)
    for (let i = fromRow * 9 + fromCol + 1; i < 81; i++) {
      const r = Math.floor(i / 9);
      const c = i % 9;
      if (!game.board[r][c].isGiven && game.board[r][c].value === 0) {
        game.setSelectedCell([r, c]);
        return;
      }
    }
    // Wrap around from the beginning
    for (let i = 0; i < fromRow * 9 + fromCol; i++) {
      const r = Math.floor(i / 9);
      const c = i % 9;
      if (!game.board[r][c].isGiven && game.board[r][c].value === 0) {
        game.setSelectedCell([r, c]);
        return;
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-6">
      <SudokuHeader
        timer={game.timer}
        difficulty={game.difficulty}
        isRunning={game.isRunning}
      />

      <div className="mt-6 w-full max-w-md">
        <SudokuBoard
          board={game.board}
          selectedCell={game.selectedCell}
          onSelectCell={game.setSelectedCell}
          onCellValueChange={handleCellValueChange}
        />
      </div>

      <div className="mt-6 w-full max-w-md">
        <SudokuControls
          selectedCell={game.selectedCell}
          notesMode={game.notesMode}
          hintsRemaining={game.hintsRemaining}
          canUndo={game.history.length > 0}
          onNumberPress={(n) => {
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
        />
      </div>

      <MultiplayerPanel />

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
