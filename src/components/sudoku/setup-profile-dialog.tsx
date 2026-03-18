import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function SetupProfileDialog() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const setupProfile = useMutation(api.users.setupProfile);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await setupProfile({ name: name.trim() });
      toast.success("Profile created!");
    } catch {
      toast.error("Failed to set up profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Welcome to Sudoku!</CardTitle>
          <CardDescription>Choose a display name to get started</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="animate-spin" />}
              Continue
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
