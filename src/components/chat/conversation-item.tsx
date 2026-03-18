import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Users } from "lucide-react";

interface ConversationItemProps {
  conversation: {
    _id: string;
    displayName: string;
    isOnline: boolean;
    type: "direct" | "group";
    lastMessage: {
      content: string;
      createdAt: number;
      type: string;
    } | null;
    unreadCount: number;
    memberCount: number;
  };
  isActive: boolean;
  onClick: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
}: ConversationItemProps) {
  const timeAgo = conversation.lastMessage
    ? formatDistanceToNow(conversation.lastMessage.createdAt, { addSuffix: true })
    : "";

  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
        isActive && "bg-accent"
      )}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
          {conversation.type === "group" ? (
            <Users className="h-5 w-5" />
          ) : (
            conversation.displayName.charAt(0).toUpperCase()
          )}
        </div>
        {conversation.type === "direct" && conversation.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-medium">
            {conversation.displayName}
          </span>
          {timeAgo && (
            <span className="flex-shrink-0 text-[10px] text-muted-foreground">
              {timeAgo}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="truncate text-xs text-muted-foreground">
            {conversation.lastMessage?.type === "image"
              ? "📷 Photo"
              : conversation.lastMessage?.type === "file"
                ? "📎 File"
                : conversation.lastMessage?.content ?? "No messages yet"}
          </span>
          {conversation.unreadCount > 0 && (
            <span className="ml-2 flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
