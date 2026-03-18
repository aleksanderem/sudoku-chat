import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function AuthScreen() {
  const { signIn } = useAuthActions();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isRegister && password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await signIn("password", { email, password, name, flow: "signUp" });
        toast.success("Account created!");
      } else {
        await signIn("password", { email, password, flow: "signIn" });
      }
    } catch {
      toast.error(
        isRegister
          ? "Could not create account. Email may already be in use."
          : "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {isRegister ? "Create Account" : "Sudoku"}
          </CardTitle>
          <CardDescription>
            {isRegister
              ? "Join the Sudoku community"
              : "Sign in to continue playing"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isRegister}
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={isRegister ? "At least 6 characters" : ""}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isRegister ? 6 : undefined}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {isRegister ? "Create Account" : "Sign In"}
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => {
                setIsRegister(!isRegister);
                setName("");
                setEmail("");
                setPassword("");
              }}
            >
              {isRegister
                ? "Already have an account? Sign in"
                : "No account? Sign up"}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
