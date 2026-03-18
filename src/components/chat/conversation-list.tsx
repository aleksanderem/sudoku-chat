import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@cvx/_generated/api";
import type { Id } from "@cvx/_generated/dataModel";
import { ConversationItem } from "./conversation-item";
import { NewConversationDialog } from "./new-conversation-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquarePlus, Search, LogOut } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";

interface ConversationListProps {
  activeConversationId: Id<"conversations"> | null;
  onSelectConversation: (id: Id<"conversations">) => void;
}

export function ConversationList({
  activeConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const conversations = useQuery(api.conversations.list);
  const user = useQuery(api.users.me);
  const [search, setSearch] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const { signOut } = useAuthActions();

  const filtered = conversations?.filter((c) =>
    c?.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Messages</h2>
          {user && (
            <p className="text-xs text-muted-foreground">
              Code: {user.friendCode}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNewDialog(true)}
          >
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void signOut()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {filtered === undefined ? (
          <div className="space-y-3 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-3 w-36 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {search ? "No conversations found" : "No conversations yet. Start a new one!"}
          </div>
        ) : (
          filtered.map(
            (conv) =>
              conv && (
                <ConversationItem
                  key={conv._id}
                  conversation={conv}
                  isActive={conv._id === activeConversationId}
                  onClick={() => onSelectConversation(conv._id)}
                />
              )
          )
        )}
      </div>

      <NewConversationDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onCreated={onSelectConversation}
      />
    </>
  );
}
