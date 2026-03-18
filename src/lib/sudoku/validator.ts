export function hasConflict(
  board: number[][],
  row: number,
  col: number,
  value: number
): boolean {
  if (value === 0) return false;

  // Check row
  for (let c = 0; c < 9; c++) {
    if (c !== col && board[row][c] === value) return true;
  }

  // Check column
  for (let r = 0; r < 9; r++) {
    if (r !== row && board[r][col] === value) return true;
  }

  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (r !== row && c !== col && board[r][c] === value) return true;
    }
  }

  return false;
}

export function isBoardComplete(board: number[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) return false;
    }
  }
  return true;
}

export function isBoardCorrect(board: number[][], solution: number[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}
