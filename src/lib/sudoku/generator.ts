import type { Difficulty } from "./types";

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isValid(board: number[][], row: number, col: number, num: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false;
    if (board[i][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = boxRow; i < boxRow + 3; i++) {
    for (let j = boxCol; j < boxCol + 3; j++) {
      if (board[i][j] === num) return false;
    }
  }
  return true;
}

function fillBoard(board: number[][]): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (fillBoard(board)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function countSolutions(board: number[][], limit: number = 2): number {
  let count = 0;

  function solve(): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(board, row, col, num)) {
              board[row][col] = num;
              if (solve()) return true;
              board[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    count++;
    return count >= limit;
  }

  solve();
  return count;
}

const CELLS_TO_REMOVE: Record<Difficulty, number> = {
  easy: 35,
  medium: 45,
  hard: 54,
};

export function generatePuzzle(difficulty: Difficulty): {
  puzzle: number[][];
  solution: number[][];
} {
  // Generate a complete valid board
  const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
  fillBoard(solution);

  // Create puzzle by removing cells
  const puzzle = solution.map((row) => [...row]);
  const cellsToRemove = CELLS_TO_REMOVE[difficulty];

  const positions = shuffleArray(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number])
  );

  let removed = 0;
  for (const [row, col] of positions) {
    if (removed >= cellsToRemove) break;

    const backup = puzzle[row][col];
    puzzle[row][col] = 0;

    // Check that puzzle still has unique solution
    const testBoard = puzzle.map((r) => [...r]);
    if (countSolutions(testBoard) === 1) {
      removed++;
    } else {
      puzzle[row][col] = backup;
    }
  }

  return { puzzle, solution };
}
