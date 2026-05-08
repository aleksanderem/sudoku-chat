import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import type { Id } from "@cvx/_generated/dataModel";
import { MessageBubble } from "./message-bubble";
import type { ChatMessage } from "./message-bubble";
import { MessageInput } from "./message-input";
import { TypingIndicator } from "./typing-indicator";
import { ArrowLeft, Users, Timer, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatViewProps {
  conversationId: Id<"conversations">;
  onBack: () => void;
}

const TTL_OPTIONS = [
  { label: "1 min", ms: 60_000 },
  { label: "5 min", ms: 5 * 60_000 },
  { label: "30 min", ms: 30 * 60_000 },
  { label: "1h", ms: 60 * 60_000 },
  { label: "6h", ms: 6 * 60 * 60_000 },
  { label: "12h", ms: 12 * 60 * 60_000 },
];

function formatTtl(ms: number): string {
  if (ms >= 60 * 60_000) return `${Math.round(ms / (60 * 60_000))}h`;
  if (ms >= 60_000) return `${Math.round(ms / 60_000)}min`;
  return `${Math.round(ms / 1000)}s`;
}

export function ChatView({ conversationId, onBack }: ChatViewProps) {
  const messages = useQuery(api.messages.list, { conversationId });
  const conversation = useQuery(api.conversations.getById, { conversationId });
  const user = useQuery(api.users.me);
  const markRead = useMutation(api.messages.markRead);
  const setTtl = useMutation(api.conversations.setMessageTtl);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTtlPicker, setShowTtlPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    _id: Id<"messages">;
    content: string;
    senderName: string;
  } | null>(null);

  const handleReply = useCallback((msg: ChatMessage) => {
    setReplyingTo({
      _id: msg._id,
      content: msg.type === "text" ? msg.content : msg.type === "image" ? "Photo" : msg.fileName ?? "File",
      senderName: msg.senderName,
    });
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages?.length]);

  useEffect(() => {
    markRead({ conversationId });
  }, [conversationId, markRead, messages?.length]);

  // Clear reply when switching conversations
  useEffect(() => {
    setReplyingTo(null);
  }, [conversationId]);

  const displayName =
    conversation?.type === "direct"
      ? conversation.members?.find((m) => m?._id !== user?._id)?.name ?? "Chat"
      : conversation?.name ?? "Group";

  const isOnline =
    conversation?.type === "direct"
      ? conversation.members?.find((m) => m?._id !== user?._id)?.isOnline ?? false
      : false;

  const currentTtl = conversation?.messageTtlMs ?? 12 * 60 * 60_000;

  async function handleSetTtl(ms: number) {
    try {
      await setTtl({ conversationId, ttlMs: ms });
      toast.success(`Messages disappear after ${formatTtl(ms)}`);
    } catch {
      toast.error("Failed to update");
    }
    setShowTtlPicker(false);
  }

  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
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

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">
            {conversation?.type === "group"
              ? `${conversation.members?.length ?? 0} members`
              : isOnline ? "Online" : "Offline"}
          </p>
        </div>

        {/* TTL settings button */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs text-muted-foreground"
            onClick={() => setShowTtlPicker(!showTtlPicker)}
          >
            <Timer className="h-3.5 w-3.5" />
            {formatTtl(currentTtl)}
            <ChevronDown className="h-3 w-3" />
          </Button>

          {showTtlPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowTtlPicker(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border bg-popover shadow-lg p-1 min-w-[140px]">
                <p className="px-2 py-1 text-[10px] text-muted-foreground font-medium uppercase">
                  Auto-delete after
                </p>
                {TTL_OPTIONS.map((opt) => (
                  <button
                    key={opt.ms}
                    onClick={() => handleSetTtl(opt.ms)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors",
                      currentTtl === opt.ms && "bg-accent font-medium"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Auto-delete banner */}
      <div className="flex items-center justify-center gap-1 py-1 bg-muted/50 text-[10px] text-muted-foreground">
        <Timer className="h-3 w-3" />
        Messages disappear after {formatTtl(currentTtl)}
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
              onReply={handleReply}
            />
          ))
        )}

        <TypingIndicator conversationId={conversationId} />
      </div>

      <MessageInput
        conversationId={conversationId}
        replyTo={replyingTo}
        onCancelReply={handleCancelReply}
      />
    </div>
  );
}
