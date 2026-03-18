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

export function useSequenceDetector({
  sequenceLength,
  board,
  eraseCells,
  onMatch,
}: UseSequenceDetectorOptions) {
  // Buffer stores digits + cell positions. We track which cells
  // we targeted at the start of the sequence attempt.
  const bufferRef = useRef<{ digit: number; row: number; col: number }[]>([]);
  const targetCellsRef = useRef<[number, number][]>([]);
  const verifySequence = useMutation(api.users.verifySecretSequence);

  function getEmptyCells(b: SudokuBoard, count: number): [number, number][] {
    const cells: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!b[r][c].isGiven && b[r][c].value === 0) {
          cells.push([r, c]);
          if (cells.length >= count) return cells;
        }
      }
    }
    return cells;
  }

  const onCellEntry = useCallback(
    async (row: number, col: number, digit: number) => {
      if (sequenceLength === 0 || digit < 0 || digit > 9) {
        bufferRef.current = [];
        targetCellsRef.current = [];
        return;
      }

      // Snapshot target cells on first digit of a sequence attempt
      if (bufferRef.current.length === 0) {
        targetCellsRef.current = getEmptyCells(board, sequenceLength);
        console.debug("[seq] snapshot targets:", targetCellsRef.current.map(c => `${c[0]},${c[1]}`));
      }

      const idx = bufferRef.current.length;
      const targets = targetCellsRef.current;

      console.debug(`[seq] entry: digit=${digit} cell=${row},${col} idx=${idx} expect=${targets[idx]?.[0]},${targets[idx]?.[1]}`);

      if (idx < targets.length && targets[idx][0] === row && targets[idx][1] === col) {
        bufferRef.current.push({ digit, row, col });
        console.debug(`[seq] buffer: [${bufferRef.current.map(e => e.digit).join(",")}] (${bufferRef.current.length}/${sequenceLength})`);

        if (bufferRef.current.length >= sequenceLength) {
          const seq = bufferRef.current.map((e) => e.digit).join("");
          const hash = await hashSequence(seq);
          console.debug(`[seq] verifying: "${seq}"`);

          try {
            const ok = await verifySequence({ hash });
            console.debug(`[seq] verify result: ${ok}`);
            if (ok) {
              const cells = bufferRef.current.map((e) => [e.row, e.col] as [number, number]);
              bufferRef.current = [];
              targetCellsRef.current = [];
              eraseCells(cells);
              onMatch();
              return;
            }
          } catch (err) {
            console.debug("[seq] verify error:", err);
          }

          bufferRef.current = [];
          targetCellsRef.current = [];
        }
      } else {
        // Wrong cell. Check if it starts a fresh sequence.
        console.debug("[seq] miss, resetting");
        bufferRef.current = [];
        targetCellsRef.current = [];

        const fresh = getEmptyCells(board, sequenceLength);
        if (fresh.length > 0 && fresh[0][0] === row && fresh[0][1] === col) {
          targetCellsRef.current = fresh;
          bufferRef.current = [{ digit, row, col }];
          console.debug(`[seq] fresh start: digit=${digit} at ${row},${col}`);
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
