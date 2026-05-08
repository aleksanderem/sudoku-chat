import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

type AuthFlow = "signIn" | "signUp" | "reset" | "reset-verify";

export function AuthScreen() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<AuthFlow>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function resetFields() {
    setName("");
    setEmail("");
    setPassword("");
    setCode("");
    setNewPassword("");
  }

  async function handleSignInOrUp(e: React.FormEvent) {
    e.preventDefault();

    if (flow === "signUp" && password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      if (flow === "signUp") {
        await signIn("password", { email, password, name, flow: "signUp" });
        toast.success("Account created!");
      } else {
        await signIn("password", { email, password, flow: "signIn" });
      }
    } catch {
      toast.error(
        flow === "signUp"
          ? "Could not create account. Email may already be in use."
          : "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await signIn("password", { email, flow: "reset" });
      toast.success("Verification code sent to your email");
      setFlow("reset-verify");
    } catch {
      toast.error("Could not send reset code. Check your email address.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetVerify(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await signIn("password", { email, code, newPassword, flow: "reset-verification" });
      toast.success("Password reset successfully!");
      resetFields();
      setFlow("signIn");
    } catch {
      toast.error("Invalid code or code expired. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // Reset request: enter email to receive code
  if (flow === "reset") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Reset Password</CardTitle>
            <CardDescription>
              Enter your email to receive a verification code
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleResetRequest}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                Send Code
              </Button>
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={() => { resetFields(); setFlow("signIn"); }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // Reset verification: enter code + new password
  if (flow === "reset-verify") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Enter Code</CardTitle>
            <CardDescription>
              Check your email for a verification code
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleResetVerify}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verify-code">Verification Code</Label>
                <Input
                  id="verify-code"
                  type="text"
                  placeholder="Enter code from email"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoFocus
                  autoComplete="one-time-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                Reset Password
              </Button>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={() => handleResetRequest({ preventDefault: () => {} } as React.FormEvent)}
              >
                Didn't receive a code? Resend
              </button>
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={() => { resetFields(); setFlow("signIn"); }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // Sign in / Sign up
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {flow === "signUp" ? "Create Account" : "Sudoku"}
          </CardTitle>
          <CardDescription>
            {flow === "signUp"
              ? "Join the Sudoku community"
              : "Sign in to continue playing"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignInOrUp}>
          <CardContent className="space-y-4">
            {flow === "signUp" && (
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={flow === "signUp"}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {flow === "signIn" && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => { setPassword(""); setFlow("reset"); }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder={flow === "signUp" ? "At least 6 characters" : ""}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={flow === "signUp" ? 6 : undefined}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {flow === "signUp" ? "Create Account" : "Sign In"}
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => {
                setFlow(flow === "signUp" ? "signIn" : "signUp");
                resetFields();
              }}
            >
              {flow === "signUp"
                ? "Already have an account? Sign in"
                : "No account? Sign up"}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
