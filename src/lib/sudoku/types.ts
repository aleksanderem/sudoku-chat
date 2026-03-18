export type Difficulty = "easy" | "medium" | "hard";

export interface SudokuCell {
  value: number; // 0 = empty
  isGiven: boolean;
  notes: Set<number>;
  isError: boolean;
}

export type SudokuBoard = SudokuCell[][];

export interface GameState {
  board: SudokuBoard;
  solution: number[][];
  difficulty: Difficulty;
  timer: number;
  isRunning: boolean;
  isComplete: boolean;
  selectedCell: [number, number] | null;
  notesMode: boolean;
  hintsRemaining: number;
  history: HistoryEntry[];
}

export interface HistoryEntry {
  row: number;
  col: number;
  prevValue: number;
  prevNotes: number[];
  newValue: number;
  newNotes: number[];
}
