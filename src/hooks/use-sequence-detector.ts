import { useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import { hashSequence } from "@/lib/crypto";

interface UseSequenceDetectorOptions {
  sequenceLength: number;
  getEmptyCellsInOrder: (count: number) => [number, number][];
  eraseCells: (cells: [number, number][]) => void;
  onMatch: () => void;
}

export function useSequenceDetector({
  sequenceLength,
  getEmptyCellsInOrder,
  eraseCells,
  onMatch,
}: UseSequenceDetectorOptions) {
  const bufferRef = useRef<{ digit: number; row: number; col: number }[]>([]);
  const verifySequence = useMutation(api.users.verifySecretSequence);

  const onCellEntry = useCallback(
    async (row: number, col: number, digit: number) => {
      if (sequenceLength === 0 || digit === 0) {
        bufferRef.current = [];
        return;
      }

      const emptyCells = getEmptyCellsInOrder(sequenceLength);
      const expectedIndex = bufferRef.current.length;

      // Check if this is the expected next cell in sequence
      if (
        expectedIndex < emptyCells.length &&
        emptyCells[expectedIndex][0] === row &&
        emptyCells[expectedIndex][1] === col
      ) {
        bufferRef.current.push({ digit, row, col });

        // Check if buffer is complete
        if (bufferRef.current.length === sequenceLength) {
          const sequence = bufferRef.current.map((e) => e.digit).join("");
          const hash = await hashSequence(sequence);

          try {
            const isValid = await verifySequence({ hash });
            if (isValid) {
              // Erase the sequence cells and enter chat
              const cellsToErase = bufferRef.current.map(
                (e) => [e.row, e.col] as [number, number]
              );
              eraseCells(cellsToErase);
              bufferRef.current = [];
              onMatch();
              return;
            }
          } catch {
            // Verification failed, just reset
          }

          bufferRef.current = [];
        }
      } else {
        // Not the expected cell - reset buffer
        bufferRef.current = [];
      }
    },
    [sequenceLength, getEmptyCellsInOrder, eraseCells, onMatch, verifySequence]
  );

  const resetBuffer = useCallback(() => {
    bufferRef.current = [];
  }, []);

  return { onCellEntry, resetBuffer };
}
