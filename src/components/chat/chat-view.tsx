import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import type { Id } from "@cvx/_generated/dataModel";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { TypingIndicator } from "./typing-indicator";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatViewProps {
  conversationId: Id<"conversations">;
  onBack: () => void;
}

export function ChatView({ conversationId, onBack }: ChatViewProps) {
  const messages = useQuery(api.messages.list, { conversationId });
  const conversation = useQuery(api.conversations.getById, { conversationId });
  const user = useQuery(api.users.me);
  const markRead = useMutation(api.messages.markRead);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages?.length]);

  // Mark as read when viewing
  useEffect(() => {
    markRead({ conversationId });
  }, [conversationId, markRead, messages?.length]);

  const displayName =
    conversation?.type === "direct"
      ? conversation.members?.find((m) => m?._id !== user?._id)?.name ?? "Chat"
      : conversation?.name ?? "Group";

  const isOnline =
    conversation?.type === "direct"
      ? conversation.members?.find((m) => m?._id !== user?._id)?.isOnline ?? false
      : false;

  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="relative">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {conversation?.type === "group" ? (
              <Users className="h-4 w-4" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
          {isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">
            {conversation?.type === "group"
              ? `${conversation.members?.length ?? 0} members`
              : isOnline
                ? "Online"
                : "Offline"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages === undefined ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              isOwn={msg.senderId === user?._id}
              conversationId={conversationId}
            />
          ))
        )}

        <TypingIndicator conversationId={conversationId} />
      </div>

      {/* Input */}
      <MessageInput conversationId={conversationId} />
    </div>
  );
}
