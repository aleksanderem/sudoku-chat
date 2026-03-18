import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@cvx/_generated/api";
import type { Id } from "@cvx/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, UserPlus, Users } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: Id<"conversations">) => void;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onCreated,
}: NewConversationDialogProps) {
  const [mode, setMode] = useState<"dm" | "group">("dm");
  const [friendCode, setFriendCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [_foundUser, setFoundUser] = useState<{
    _id: Id<"users">;
    name: string | undefined;
  } | null>(null);

  const foundUserQuery = useQuery(
    api.users.findByFriendCode,
    friendCode.length === 8 ? { friendCode } : "skip"
  );

  const createDirect = useMutation(api.conversations.createDirect);
  const createGroup = useMutation(api.conversations.createGroup);

  async function handleCreateDM() {
    if (!foundUserQuery) return;
    setLoading(true);
    try {
      const id = await createDirect({ userId: foundUserQuery._id });
      toast.success("Conversation created!");
      onCreated(id);
      onOpenChange(false);
      resetState();
    } catch (err) {
      toast.error("Failed to create conversation");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup() {
    if (!groupName.trim()) return;
    setLoading(true);
    try {
      const id = await createGroup({ name: groupName.trim(), memberIds: [] });
      toast.success("Group created!");
      onCreated(id);
      onOpenChange(false);
      resetState();
    } catch (err) {
      toast.error("Failed to create group");
    } finally {
      setLoading(false);
    }
  }

  function resetState() {
    setFriendCode("");
    setGroupName("");
    setFoundUser(null);
    setMode("dm");
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">
            New Conversation
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mt-1">
            Start a direct message or create a group chat
          </Dialog.Description>

          {/* Mode tabs */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={mode === "dm" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("dm")}
              className="flex-1"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Direct Message
            </Button>
            <Button
              variant={mode === "group" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("group")}
              className="flex-1"
            >
              <Users className="h-4 w-4 mr-1" />
              Group
            </Button>
          </div>

          <div className="mt-4 space-y-4">
            {mode === "dm" ? (
              <>
                <div className="space-y-2">
                  <Label>Friend Code</Label>
                  <Input
                    placeholder="Enter 8-character code"
                    value={friendCode}
                    onChange={(e) =>
                      setFriendCode(e.target.value.toUpperCase().slice(0, 8))
                    }
                    maxLength={8}
                    className="uppercase tracking-widest"
                  />
                </div>

                {friendCode.length === 8 && (
                  <div className="rounded-lg border p-3">
                    {foundUserQuery === undefined ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching...
                      </div>
                    ) : foundUserQuery === null ? (
                      <p className="text-sm text-destructive">User not found</p>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                            {foundUserQuery.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{foundUserQuery.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {foundUserQuery.isOnline ? "Online" : "Offline"}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" onClick={handleCreateDM} disabled={loading}>
                          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                          Chat
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input
                    placeholder="Enter group name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateGroup}
                  disabled={loading || !groupName.trim()}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Group
                </Button>
              </>
            )}
          </div>

          <Dialog.Close asChild>
            <Button variant="ghost" className="absolute right-4 top-4" size="icon">
              ✕
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
