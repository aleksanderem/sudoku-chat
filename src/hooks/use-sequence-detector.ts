import { useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import { hashSequence } from "@/lib/crypto";
import type { SudokuBoard } from "@/lib/sudoku/types";

interface UseSequenceDetectorOptions {
  sequenceLength: number;
  board: SudokuBoard;
  eraseCells: (cells: [number, number][]) => void;
  onMatch: () => void;
}

/**
 * Detects when the user enters the secret sequence into the first N
 * empty cells of the Sudoku board (reading order).
 *
 * On the first entry of a potential sequence, we snapshot which cells
 * are expected targets. This avoids timing issues where board re-renders
 * shift the "empty cells" list between entries.
 */
export function useSequenceDetector({
  sequenceLength,
  board,
  eraseCells,
  onMatch,
}: UseSequenceDetectorOptions) {
  const bufferRef = useRef<{ digit: number; row: number; col: number }[]>([]);
  const targetCellsRef = useRef<[number, number][]>([]);
  const verifySequence = useMutation(api.users.verifySecretSequence);

  function snapshotEmptyCells(currentBoard: SudokuBoard, count: number): [number, number][] {
    const cells: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!currentBoard[r][c].isGiven && currentBoard[r][c].value === 0) {
          cells.push([r, c]);
          if (cells.length >= count) return cells;
        }
      }
    }
    return cells;
  }

  const onCellEntry = useCallback(
    async (row: number, col: number, digit: number) => {
      if (sequenceLength === 0 || digit < 0) {
        bufferRef.current = [];
        targetCellsRef.current = [];
        return;
      }

      // On first entry, snapshot the target cells from current board
      if (bufferRef.current.length === 0) {
        targetCellsRef.current = snapshotEmptyCells(board, sequenceLength);
      }

      const expectedIndex = bufferRef.current.length;
      const targets = targetCellsRef.current;

      if (
        expectedIndex < targets.length &&
        targets[expectedIndex][0] === row &&
        targets[expectedIndex][1] === col
      ) {
        bufferRef.current.push({ digit, row, col });

        if (bufferRef.current.length >= sequenceLength) {
          const sequence = bufferRef.current.map((e) => e.digit).join("");
          const hash = await hashSequence(sequence);

          try {
            const isValid = await verifySequence({ hash });
            if (isValid) {
              const cellsToErase = bufferRef.current.map(
                (e) => [e.row, e.col] as [number, number]
              );
              bufferRef.current = [];
              targetCellsRef.current = [];
              eraseCells(cellsToErase);
              onMatch();
              return;
            }
          } catch {
            // Verification failed
          }

          bufferRef.current = [];
          targetCellsRef.current = [];
        }
      } else {
        // Wrong cell - reset. But check if this entry starts a NEW sequence.
        bufferRef.current = [];
        targetCellsRef.current = [];

        const freshTargets = snapshotEmptyCells(board, sequenceLength);
        if (
          freshTargets.length > 0 &&
          freshTargets[0][0] === row &&
          freshTargets[0][1] === col
        ) {
          targetCellsRef.current = freshTargets;
          bufferRef.current = [{ digit, row, col }];
        }
      }
    },
    [sequenceLength, board, eraseCells, onMatch, verifySequence]
  );

  const resetBuffer = useCallback(() => {
    bufferRef.current = [];
    targetCellsRef.current = [];
  }, []);

  return { onCellEntry, resetBuffer };
}
