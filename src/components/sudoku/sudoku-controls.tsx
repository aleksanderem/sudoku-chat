import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@cvx/_generated/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Undo2, Eraser, Lightbulb, PenLine, RotateCcw, LogOut, KeyRound, Share2, Lock } from "lucide-react";
import { toast } from "sonner";
import type { Difficulty } from "@/lib/sudoku/types";

type SettingsView = "main" | "resetCode" | "changePwSend" | "changePwVerify";

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
  userEmail?: string;
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
  userEmail,
}: SudokuControlsProps) {
  const [showDevOptions, setShowDevOptions] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>("main");
  const [verifyCode, setVerifyCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { signIn, signOut } = useAuthActions();
  const resetSequence = useMutation(api.users.setSecretSequence);

  function closeSettings() {
    setShowDevOptions(false);
    setSettingsView("main");
    setVerifyCode("");
    setNewPassword("");
  }

  function handleHintTap() {
    if (hintsRemaining > 0 && selectedCell) {
      onHint();
    }
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

  async function handleResetSecretCode() {
    setLoading(true);
    try {
      await resetSequence({ hash: "", length: 0 });
      toast.success("Code reset. Set a new one.");
      closeSettings();
    } catch {
      toast.error("Reset failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendPasswordReset() {
    if (!userEmail) {
      toast.error("Email not available");
      return;
    }
    setLoading(true);
    try {
      await signIn("password", { email: userEmail, flow: "reset" });
      toast.success("Code sent to your email");
      setSettingsView("changePwVerify");
    } catch {
      toast.error("Could not send reset code");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPasswordReset() {
    if (!userEmail || !verifyCode || !newPassword) return;
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await signIn("password", {
        email: userEmail,
        code: verifyCode,
        newPassword,
        flow: "reset-verification",
      });
      toast.success("Password changed!");
      closeSettings();
    } catch {
      toast.error("Invalid code or code expired");
    } finally {
      setLoading(false);
    }
  }

  function renderSettingsContent() {
    if (settingsView === "resetCode") {
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">
            This will remove your current secret code. You'll need to set a new one to access chat.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setSettingsView("main")}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1 text-xs text-destructive" onClick={handleResetSecretCode} disabled={loading}>
              Reset Code
            </Button>
          </div>
        </div>
      );
    }

    if (settingsView === "changePwSend") {
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">
            Send a verification code to <span className="font-medium text-foreground">{userEmail}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setSettingsView("main")}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1 text-xs" onClick={handleSendPasswordReset} disabled={loading}>
              Send Code
            </Button>
          </div>
        </div>
      );
    }

    if (settingsView === "changePwVerify") {
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">Check your email for the code</p>
          <Input
            type="text"
            placeholder="Verification code"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            autoFocus
            autoComplete="one-time-code"
          />
          <Input
            type="password"
            placeholder="New password (min 6 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { setSettingsView("main"); setVerifyCode(""); setNewPassword(""); }}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1 text-xs" onClick={handleVerifyPasswordReset} disabled={loading || !verifyCode || !newPassword}>
              Change Password
            </Button>
          </div>
          <button
            type="button"
            className="w-full text-[10px] text-muted-foreground hover:text-primary transition-colors"
            onClick={handleSendPasswordReset}
          >
            Didn't get a code? Resend
          </button>
        </div>
      );
    }

    // Main settings view
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setSettingsView("resetCode")}>
            <KeyRound className="h-3.5 w-3.5 mr-1" />
            Reset Code
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs text-destructive" onClick={() => void signOut()}>
            <LogOut className="h-3.5 w-3.5 mr-1" />
            Log Out
          </Button>
        </div>
        {userEmail && (
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setSettingsView("changePwSend")}>
            <Lock className="h-3.5 w-3.5 mr-1" />
            Change Password
          </Button>
        )}
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => {
          const url = `${window.location.origin}/play?game`;
          navigator.clipboard.writeText(url);
          toast.success("Game link copied! Share it with friends.");
        }}>
          <Share2 className="h-3.5 w-3.5 mr-1" />
          Share Game (no chat)
        </Button>
      </div>
    );
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
          {renderSettingsContent()}
          <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={closeSettings}>
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
