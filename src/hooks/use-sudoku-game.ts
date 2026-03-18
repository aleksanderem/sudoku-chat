import { useState, useCallback, useEffect, useRef } from "react";
import type { Difficulty, SudokuBoard, HistoryEntry } from "@/lib/sudoku/types";
import { generatePuzzle } from "@/lib/sudoku/generator";
import { hasConflict, isBoardComplete, isBoardCorrect } from "@/lib/sudoku/validator";

const STORAGE_KEY = "sudoku_game_state";

interface SavedState {
  boardValues: number[][];
  boardGiven: boolean[][];
  boardNotes: number[][][];
  solution: number[][];
  difficulty: Difficulty;
  timer: number;
  hintsRemaining: number;
}

function createBoard(puzzle: number[][]): SudokuBoard {
  return puzzle.map((row) =>
    row.map((value) => ({
      value,
      isGiven: value !== 0,
      notes: new Set<number>(),
      isError: false,
    }))
  );
}

function saveToStorage(board: SudokuBoard, solution: number[][], difficulty: Difficulty, timer: number, hintsRemaining: number) {
  const state: SavedState = {
    boardValues: board.map((row) => row.map((cell) => cell.value)),
    boardGiven: board.map((row) => row.map((cell) => cell.isGiven)),
    boardNotes: board.map((row) => row.map((cell) => [...cell.notes])),
    solution,
    difficulty,
    timer,
    hintsRemaining,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadFromStorage(): {
  board: SudokuBoard;
  solution: number[][];
  difficulty: Difficulty;
  timer: number;
  hintsRemaining: number;
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state: SavedState = JSON.parse(raw);
    const board: SudokuBoard = state.boardValues.map((row, r) =>
      row.map((value, c) => ({
        value,
        isGiven: state.boardGiven[r][c],
        notes: new Set(state.boardNotes[r][c]),
        isError: false,
      }))
    );
    return {
      board,
      solution: state.solution,
      difficulty: state.difficulty,
      timer: state.timer,
      hintsRemaining: state.hintsRemaining,
    };
  } catch {
    return null;
  }
}

function updateErrors(board: SudokuBoard): SudokuBoard {
  const values = board.map((row) => row.map((cell) => cell.value));
  return board.map((row, r) =>
    row.map((cell, c) => ({
      ...cell,
      isError: cell.value !== 0 && !cell.isGiven && hasConflict(values, r, c, cell.value),
    }))
  );
}

export function useSudokuGame() {
  const [board, setBoard] = useState<SudokuBoard>(() => {
    const saved = loadFromStorage();
    if (saved) return updateErrors(saved.board);
    const { puzzle } = generatePuzzle("medium");
    return createBoard(puzzle);
  });

  const [solution, setSolution] = useState<number[][]>(() => {
    const saved = loadFromStorage();
    if (saved) return saved.solution;
    return board.map((row) => row.map((cell) => cell.value));
  });

  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    const saved = loadFromStorage();
    return saved?.difficulty ?? "medium";
  });

  const [timer, setTimer] = useState(() => {
    const saved = loadFromStorage();
    return saved?.timer ?? 0;
  });

  const [isRunning, setIsRunning] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(() => {
    const saved = loadFromStorage();
    return saved?.hintsRemaining ?? 3;
  });
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Timer
  useEffect(() => {
    if (!isRunning || isComplete) return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning, isComplete]);

  // Save state on changes
  const boardRef = useRef(board);
  boardRef.current = board;
  useEffect(() => {
    if (!isComplete) {
      saveToStorage(board, solution, difficulty, timer, hintsRemaining);
    }
  }, [board, solution, difficulty, timer, hintsRemaining, isComplete]);

  // Check completion
  useEffect(() => {
    const values = board.map((row) => row.map((cell) => cell.value));
    if (isBoardComplete(values) && isBoardCorrect(values, solution)) {
      setIsComplete(true);
      setIsRunning(false);
    }
  }, [board, solution]);

  const newGame = useCallback((diff: Difficulty) => {
    const { puzzle, solution: sol } = generatePuzzle(diff);
    setBoard(createBoard(puzzle));
    setSolution(sol);
    setDifficulty(diff);
    setTimer(0);
    setIsRunning(true);
    setIsComplete(false);
    setSelectedCell(null);
    setNotesMode(false);
    setHintsRemaining(3);
    setHistory([]);
  }, []);

  const setCellValue = useCallback(
    (row: number, col: number, value: number) => {
      setBoard((prev) => {
        if (prev[row][col].isGiven) return prev;
        const newBoard = prev.map((r) => r.map((c) => ({ ...c, notes: new Set(c.notes) })));

        // Save history
        setHistory((h) => [
          ...h,
          {
            row,
            col,
            prevValue: prev[row][col].value,
            prevNotes: [...prev[row][col].notes],
            newValue: value,
            newNotes: [],
          },
        ]);

        newBoard[row][col] = {
          ...newBoard[row][col],
          value,
          notes: new Set(),
        };

        // Remove notes from same row, col, box
        if (value !== 0) {
          for (let i = 0; i < 9; i++) {
            newBoard[row][i].notes.delete(value);
            newBoard[i][col].notes.delete(value);
          }
          const boxRow = Math.floor(row / 3) * 3;
          const boxCol = Math.floor(col / 3) * 3;
          for (let r = boxRow; r < boxRow + 3; r++) {
            for (let c = boxCol; c < boxCol + 3; c++) {
              newBoard[r][c].notes.delete(value);
            }
          }
        }

        return updateErrors(newBoard);
      });
    },
    []
  );

  const toggleNote = useCallback((row: number, col: number, value: number) => {
    setBoard((prev) => {
      if (prev[row][col].isGiven || prev[row][col].value !== 0) return prev;
      const newBoard = prev.map((r) => r.map((c) => ({ ...c, notes: new Set(c.notes) })));
      const notes = newBoard[row][col].notes;
      if (notes.has(value)) {
        notes.delete(value);
      } else {
        notes.add(value);
      }
      return newBoard;
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const entry = prev[prev.length - 1];
      setBoard((board) => {
        const newBoard = board.map((r) => r.map((c) => ({ ...c, notes: new Set(c.notes) })));
        newBoard[entry.row][entry.col] = {
          ...newBoard[entry.row][entry.col],
          value: entry.prevValue,
          notes: new Set(entry.prevNotes),
        };
        return updateErrors(newBoard);
      });
      return prev.slice(0, -1);
    });
  }, []);

  const useHint = useCallback(() => {
    if (hintsRemaining <= 0 || !selectedCell) return;
    const [row, col] = selectedCell;
    if (board[row][col].isGiven) return;
    const correctValue = solution[row][col];
    setCellValue(row, col, correctValue);
    setHintsRemaining((h) => h - 1);
  }, [hintsRemaining, selectedCell, board, solution, setCellValue]);

  const erase = useCallback(() => {
    if (!selectedCell) return;
    const [row, col] = selectedCell;
    if (board[row][col].isGiven) return;
    setCellValue(row, col, 0);
  }, [selectedCell, board, setCellValue]);

  // Get first N empty cells in reading order (for sequence detection)
  const getEmptyCellsInOrder = useCallback(
    (count: number): [number, number][] => {
      const cells: [number, number][] = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (!board[r][c].isGiven && board[r][c].value === 0) {
            cells.push([r, c]);
            if (cells.length >= count) return cells;
          }
        }
      }
      return cells;
    },
    [board]
  );

  const eraseCells = useCallback((cells: [number, number][]) => {
    setBoard((prev) => {
      const newBoard = prev.map((r) => r.map((c) => ({ ...c, notes: new Set(c.notes) })));
      for (const [r, c] of cells) {
        if (!newBoard[r][c].isGiven) {
          newBoard[r][c].value = 0;
        }
      }
      return updateErrors(newBoard);
    });
  }, []);

  return {
    board,
    solution,
    difficulty,
    timer,
    isRunning,
    isComplete,
    selectedCell,
    notesMode,
    hintsRemaining,
    history,
    newGame,
    setCellValue,
    toggleNote,
    setSelectedCell,
    setNotesMode,
    undo,
    useHint,
    erase,
    getEmptyCellsInOrder,
    eraseCells,
  };
}
