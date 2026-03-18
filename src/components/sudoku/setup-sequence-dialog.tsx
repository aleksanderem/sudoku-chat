import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import { hashSequence } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";

export function SetupSequenceDialog() {
  const [sequence, setSequence] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [loading, setLoading] = useState(false);
  const setSecretSequence = useMutation(api.users.setSecretSequence);

  function handleSequenceChange(value: string) {
    // Only allow digits, 4-8 characters
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (step === "enter") {
      setSequence(digits);
    } else {
      setConfirm(digits);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (step === "enter") {
      if (sequence.length < 4) {
        toast.error("Sequence must be at least 4 digits");
        return;
      }
      setStep("confirm");
      return;
    }

    if (confirm !== sequence) {
      toast.error("Sequences don't match. Try again.");
      setConfirm("");
      return;
    }

    setLoading(true);
    try {
      const hash = await hashSequence(sequence);
      await setSecretSequence({ hash, length: sequence.length });
      toast.success("Secret sequence set!");
    } catch {
      toast.error("Failed to save sequence");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Set Your Secret Code</CardTitle>
          <CardDescription>
            {step === "enter"
              ? "Choose a 4-8 digit sequence. Enter it into the first empty Sudoku cells to unlock a hidden feature."
              : "Confirm your secret sequence"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sequence">
                {step === "enter" ? "Secret Sequence" : "Confirm Sequence"}
              </Label>
              <Input
                id="sequence"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={step === "enter" ? "e.g. 1234" : "Re-enter your sequence"}
                value={step === "enter" ? sequence : confirm}
                onChange={(e) => handleSequenceChange(e.target.value)}
                autoFocus
                required
                minLength={4}
                maxLength={8}
              />
              {step === "enter" && (
                <p className="text-xs text-muted-foreground">
                  {sequence.length}/8 digits (minimum 4)
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || (step === "enter" ? sequence.length < 4 : confirm.length < 4)}
            >
              {loading && <Loader2 className="animate-spin" />}
              {step === "enter" ? "Continue" : "Set Sequence"}
            </Button>
            {step === "confirm" && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("enter");
                  setConfirm("");
                }}
              >
                Back
              </Button>
            )}
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
