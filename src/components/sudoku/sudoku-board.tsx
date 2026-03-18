import { cn } from "@/lib/utils";
import type { SudokuBoard as SudokuBoardType } from "@/lib/sudoku/types";

interface SudokuBoardProps {
  board: SudokuBoardType;
  selectedCell: [number, number] | null;
  onSelectCell: (cell: [number, number]) => void;
  onCellValueChange: (row: number, col: number, value: number) => void;
}

export function SudokuBoard({
  board,
  selectedCell,
  onSelectCell,
  onCellValueChange,
}: SudokuBoardProps) {
  const selectedValue =
    selectedCell && board[selectedCell[0]][selectedCell[1]].value;

  function handleKeyDown(e: React.KeyboardEvent, row: number, col: number) {
    if (e.key >= "1" && e.key <= "9") {
      e.preventDefault();
      onCellValueChange(row, col, parseInt(e.key));
    } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
      e.preventDefault();
      onCellValueChange(row, col, 0);
    } else if (e.key === "ArrowUp" && row > 0) {
      e.preventDefault();
      onSelectCell([row - 1, col]);
    } else if (e.key === "ArrowDown" && row < 8) {
      e.preventDefault();
      onSelectCell([row + 1, col]);
    } else if (e.key === "ArrowLeft" && col > 0) {
      e.preventDefault();
      onSelectCell([row, col - 1]);
    } else if (e.key === "ArrowRight" && col < 8) {
      e.preventDefault();
      onSelectCell([row, col + 1]);
    }
  }

  return (
    <div className="grid grid-cols-9 border-2 border-foreground/30 rounded-lg overflow-hidden aspect-square">
      {board.map((row, r) =>
        row.map((cell, c) => {
          const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
          const isSameRow = selectedCell?.[0] === r;
          const isSameCol = selectedCell?.[1] === c;
          const isSameBox =
            selectedCell &&
            Math.floor(selectedCell[0] / 3) === Math.floor(r / 3) &&
            Math.floor(selectedCell[1] / 3) === Math.floor(c / 3);
          const isHighlighted =
            !isSelected && (isSameRow || isSameCol || isSameBox);
          const isSameValue =
            !isSelected &&
            selectedValue !== 0 &&
            cell.value !== 0 &&
            cell.value === selectedValue;

          return (
            <button
              key={`${r}-${c}`}
              className={cn(
                "relative flex items-center justify-center text-lg font-medium aspect-square outline-none transition-colors duration-100",
                // Border styling for 3x3 boxes
                c % 3 === 2 && c !== 8 && "border-r-2 border-r-foreground/20",
                c % 3 !== 2 && c !== 8 && "border-r border-r-border",
                r % 3 === 2 && r !== 8 && "border-b-2 border-b-foreground/20",
                r % 3 !== 2 && r !== 8 && "border-b border-b-border",
                // Cell states
                isSelected && "bg-primary/20 ring-2 ring-inset ring-primary/40",
                isHighlighted && !isSameValue && "bg-primary/5",
                isSameValue && "bg-primary/15",
                // Value styling
                cell.isGiven && "sudoku-cell-given",
                !cell.isGiven && cell.value !== 0 && !cell.isError && "sudoku-cell-user",
                cell.isError && "sudoku-cell-error bg-destructive/10",
                // Hover
                !isSelected && "hover:bg-primary/10"
              )}
              onClick={() => onSelectCell([r, c])}
              onKeyDown={(e) => handleKeyDown(e, r, c)}
              tabIndex={isSelected ? 0 : -1}
              aria-label={`Row ${r + 1} Column ${c + 1}${cell.value ? ` Value ${cell.value}` : " Empty"}`}
            >
              {cell.value !== 0 ? (
                <span className="text-base sm:text-lg">{cell.value}</span>
              ) : cell.notes.size > 0 ? (
                <div className="grid grid-cols-3 gap-0 text-[8px] sm:text-[9px] leading-none text-muted-foreground w-full h-full p-0.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <span
                      key={n}
                      className="flex items-center justify-center"
                    >
                      {cell.notes.has(n) ? n : ""}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          );
        })
      )}
    </div>
  );
}
