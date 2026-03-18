import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import type { Id } from "@cvx/_generated/dataModel";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { SmilePlus, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactionPicker } from "./reaction-picker";

interface MessageBubbleProps {
  message: {
    _id: Id<"messages">;
    content: string;
    type: string;
    senderName: string;
    senderId: Id<"users">;
    createdAt: number;
    isEdited: boolean;
    isDeleted: boolean;
    fileUrl: string | null;
    fileName?: string;
    mimeType?: string;
    reactions: { emoji: string; count: number; userIds: string[] }[];
    replyTo: { _id: Id<"messages">; content: string; senderName: string } | null;
  };
  isOwn: boolean;
  conversationId: Id<"conversations">;
}

export function MessageBubble({ message, isOwn, conversationId }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const toggleReaction = useMutation(api.reactions.toggle);
  const deleteMessage = useMutation(api.messages.remove);

  if (message.type === "system") {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  if (message.isDeleted) {
    return (
      <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
        <div className="max-w-[75%] rounded-2xl px-4 py-2 bg-muted/50">
          <p className="text-sm italic text-muted-foreground">Message deleted</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("group flex gap-2", isOwn ? "justify-end" : "justify-start")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactionPicker(false);
      }}
    >
      <div className={cn("max-w-[75%] space-y-1", isOwn && "items-end")}>
        {/* Sender name (for group chats, only other people) */}
        {!isOwn && (
          <p className="text-[11px] font-medium text-muted-foreground ml-3">
            {message.senderName}
          </p>
        )}

        {/* Reply preview */}
        {message.replyTo && (
          <div className={cn(
            "text-xs border-l-2 border-primary/50 pl-2 ml-3 text-muted-foreground mb-1",
            isOwn && "mr-3 ml-0 border-l-0 border-r-2 pr-2 text-right"
          )}>
            <span className="font-medium">{message.replyTo.senderName}</span>
            <p className="truncate">{message.replyTo.content}</p>
          </div>
        )}

        <div className="relative">
          <div
            className={cn(
              "rounded-2xl px-4 py-2",
              isOwn
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted rounded-bl-md"
            )}
          >
            {/* Text */}
            {message.type === "text" && (
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            )}

            {/* Image */}
            {message.type === "image" && message.fileUrl && (
              <div className="space-y-1">
                <img
                  src={message.fileUrl}
                  alt="Shared image"
                  className="rounded-lg max-w-full max-h-64 object-cover"
                />
                {message.content && (
                  <p className="text-sm">{message.content}</p>
                )}
              </div>
            )}

            {/* File */}
            {message.type === "file" && message.fileUrl && (
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 text-sm underline",
                  isOwn ? "text-primary-foreground" : "text-foreground"
                )}
              >
                <Download className="h-4 w-4" />
                {message.fileName ?? "Download file"}
              </a>
            )}

            {/* Time + edited */}
            <div className={cn(
              "flex items-center gap-1 mt-1",
              isOwn ? "justify-end" : "justify-start"
            )}>
              <span className={cn(
                "text-[10px]",
                isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
              )}>
                {formatDistanceToNow(message.createdAt, { addSuffix: true })}
              </span>
              {message.isEdited && (
                <span className={cn(
                  "text-[10px]",
                  isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                )}>
                  (edited)
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className={cn(
              "absolute top-0 flex gap-0.5",
              isOwn ? "-left-20" : "-right-20"
            )}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowReactionPicker(!showReactionPicker)}
              >
                <SmilePlus className="h-3.5 w-3.5" />
              </Button>
              {isOwn && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => deleteMessage({ messageId: message._id })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}

          {/* Reaction picker */}
          {showReactionPicker && (
            <div className={cn(
              "absolute -top-10 z-10",
              isOwn ? "right-0" : "left-0"
            )}>
              <ReactionPicker
                onSelect={(emoji) => {
                  toggleReaction({ messageId: message._id, emoji });
                  setShowReactionPicker(false);
                }}
              />
            </div>
          )}
        </div>

        {/* Reactions display */}
        {message.reactions.length > 0 && (
          <div className={cn("flex flex-wrap gap-1 mt-1", isOwn ? "justify-end mr-2" : "ml-2")}>
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs hover:bg-accent transition-colors"
                onClick={() => toggleReaction({ messageId: message._id, emoji: r.emoji })}
              >
                <span>{r.emoji}</span>
                <span className="text-muted-foreground">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
