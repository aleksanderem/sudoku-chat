import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@cvx/_generated/api";
import { hashSequence } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Undo2, Eraser, Lightbulb, PenLine, RotateCcw, LogOut, KeyRound } from "lucide-react";
import { toast } from "sonner";
import type { Difficulty } from "@/lib/sudoku/types";

interface SudokuControlsProps {
  selectedCell: [number, number] | null;
  notesMode: boolean;
  hintsRemaining: number;
  canUndo: boolean;
  onNumberPress: (n: number) => void;
  onNotesToggle: () => void;
  onUndo: () => void;
  onErase: () => void;
  onHint: () => void;
  onNewGame: (difficulty: Difficulty) => void;
  difficulty: Difficulty;
}

const SECRET_TAP_COUNT = 8;

export function SudokuControls({
  selectedCell,
  notesMode,
  hintsRemaining,
  canUndo,
  onNumberPress,
  onNotesToggle,
  onUndo,
  onErase,
  onHint,
  onNewGame,
  difficulty,
}: SudokuControlsProps) {
  const [showDevOptions, setShowDevOptions] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetting, setResetting] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const { signOut } = useAuthActions();
  const verifySequence = useMutation(api.users.verifySecretSequence);
  const resetSequence = useMutation(api.users.setSecretSequence);

  function handleHintTap() {
    // Only use actual hint if available
    if (hintsRemaining > 0 && selectedCell) {
      onHint();
    }
    // Always count taps for secret settings unlock
    tapCountRef.current++;
    clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= SECRET_TAP_COUNT) {
      setShowDevOptions(true);
      tapCountRef.current = 0;
      toast("Settings unlocked", { duration: 1500 });
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 2000);
    }
  }

  async function handleResetCode() {
    if (!resetCode.trim()) return;
    setResetting(true);
    try {
      const hash = await hashSequence(resetCode);
      const ok = await verifySequence({ hash });
      if (ok) {
        await resetSequence({ hash: "", length: 0 });
        toast.success("Code reset. Set a new one.");
        setShowDevOptions(false);
        setShowResetForm(false);
        setResetCode("");
      } else {
        toast.error("Wrong code");
      }
    } catch {
      toast.error("Verification failed");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Number pad */}
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
          <Button
            key={n}
            variant="outline"
            size="sm"
            className="h-11 text-base font-semibold"
            onClick={() => onNumberPress(n)}
            disabled={!selectedCell}
          >
            {n}
          </Button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="flex-col gap-0.5 h-auto py-2" onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="h-5 w-5" />
          <span className="text-[10px]">Undo</span>
        </Button>
        <Button variant="ghost" size="sm" className="flex-col gap-0.5 h-auto py-2" onClick={onErase} disabled={!selectedCell}>
          <Eraser className="h-5 w-5" />
          <span className="text-[10px]">Erase</span>
        </Button>
        <Button variant="ghost" size="sm" className={cn("flex-col gap-0.5 h-auto py-2", notesMode && "bg-primary/10 text-primary")} onClick={onNotesToggle}>
          <PenLine className="h-5 w-5" />
          <span className="text-[10px]">Notes</span>
        </Button>
        <div onPointerDown={handleHintTap}>
          <Button variant="ghost" size="sm" className="flex-col gap-0.5 h-auto py-2" disabled={hintsRemaining <= 0 || !selectedCell} tabIndex={-1}>
            <Lightbulb className="h-5 w-5" />
            <span className="text-[10px]">Hint ({hintsRemaining})</span>
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="flex-col gap-0.5 h-auto py-2" onClick={() => onNewGame(difficulty)}>
          <RotateCcw className="h-5 w-5" />
          <span className="text-[10px]">New</span>
        </Button>
      </div>

      {/* Hidden settings (tap Hint 8x to reveal) */}
      {showDevOptions && (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 space-y-2 animate-in fade-in">
          <p className="text-xs text-muted-foreground text-center">Settings</p>

          {showResetForm ? (
            <div className="space-y-2">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Enter current code"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { setShowResetForm(false); setResetCode(""); }}>
                  Cancel
                </Button>
                <Button size="sm" className="flex-1 text-xs" onClick={handleResetCode} disabled={resetting || !resetCode}>
                  Confirm Reset
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setShowResetForm(true)}>
                <KeyRound className="h-3.5 w-3.5 mr-1" />
                Reset Code
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs text-destructive" onClick={() => void signOut()}>
                <LogOut className="h-3.5 w-3.5 mr-1" />
                Log Out
              </Button>
            </div>
          )}

          <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => { setShowDevOptions(false); setShowResetForm(false); setResetCode(""); }}>
            Close
          </Button>
        </div>
      )}

      {/* Difficulty selector */}
      <div className="flex items-center justify-center gap-2">
        {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
          <Button key={d} variant={d === difficulty ? "default" : "outline"} size="sm" className="capitalize text-xs" onClick={() => onNewGame(d)}>
            {d}
          </Button>
        ))}
      </div>
    </div>
  );
}
