import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import type { Id } from "@cvx/_generated/dataModel";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { SmilePlus, Trash2, Download, Eye, EyeOff, Lock, Reply, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactionPicker } from "./reaction-picker";
import { toast } from "sonner";

export interface ChatMessage {
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
  maxViews?: number;
  viewCount?: number;
  reactions: { emoji: string; count: number; userIds: string[] }[];
  replyTo: { _id: Id<"messages">; content: string; senderName: string } | null;
}

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  conversationId: Id<"conversations">;
  onReply?: (message: ChatMessage) => void;
}

const SWIPE_THRESHOLD = 70;
const MAX_SWIPE = 100;
const ACTION_PANEL_WIDTH = 100;

export function MessageBubble({ message, isOwn, onReply }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [revealedUrl, setRevealedUrl] = useState<string | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [showSwipeActions, setShowSwipeActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  const toggleReaction = useMutation(api.reactions.toggle);
  const deleteMessage = useMutation(api.messages.remove);
  const editMessage = useMutation(api.messages.edit);
  const openViewLimited = useMutation(api.messages.openViewLimited);

  const touchRef = useRef<{
    startX: number;
    startY: number;
    swiping: boolean;
    locked: boolean;
    direction: "left" | "right" | null;
  } | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    if (editing) return;
    const touch = e.touches[0];
    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      swiping: false,
      locked: false,
      direction: null,
    };
    if (showSwipeActions) {
      setShowSwipeActions(false);
      setSwipeX(0);
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchRef.current || editing) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchRef.current.startX;
    const dy = touch.clientY - touchRef.current.startY;

    if (!touchRef.current.locked) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        touchRef.current.locked = true;
        if (Math.abs(dx) > Math.abs(dy)) {
          touchRef.current.swiping = true;
          touchRef.current.direction = dx > 0 ? "right" : "left";
        } else {
          touchRef.current.swiping = false;
        }
      }
      return;
    }

    if (!touchRef.current.swiping) return;
    e.preventDefault();

    if (touchRef.current.direction === "right") {
      setSwipeX(Math.min(Math.max(dx, 0), MAX_SWIPE));
    } else {
      setSwipeX(Math.max(Math.min(dx, 0), -MAX_SWIPE));
    }
  }

  function handleTouchEnd() {
    if (!touchRef.current || editing) return;
    if (touchRef.current.swiping) {
      if (touchRef.current.direction === "right" && swipeX >= SWIPE_THRESHOLD && onReply) {
        navigator.vibrate?.(10);
        onReply(message);
      } else if (touchRef.current.direction === "left" && swipeX <= -SWIPE_THRESHOLD && isOwn) {
        navigator.vibrate?.(10);
        setShowSwipeActions(true);
        setSwipeX(-ACTION_PANEL_WIDTH);
        touchRef.current = null;
        return;
      }
    }
    touchRef.current = null;
    setSwipeX(0);
  }

  function handleStartEdit() {
    setEditText(message.content);
    setEditing(true);
    setShowSwipeActions(false);
    setSwipeX(0);
  }

  async function handleSaveEdit() {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== message.content) {
      try {
        await editMessage({ messageId: message._id, content: trimmed });
      } catch {
        toast.error("Failed to edit message");
      }
    }
    setEditing(false);
  }

  function handleDelete() {
    deleteMessage({ messageId: message._id });
    setShowSwipeActions(false);
    setSwipeX(0);
  }

  function dismissActions() {
    setShowSwipeActions(false);
    setSwipeX(0);
  }

  const isViewLimited = message.maxViews !== undefined && message.maxViews > 0;
  const viewsRemaining = isViewLimited
    ? Math.max(0, (message.maxViews ?? 0) - (message.viewCount ?? 0))
    : 0;
  const isExpired = isViewLimited && viewsRemaining <= 0;

  async function handleOpenViewLimited() {
    if (isExpired) {
      toast.error("No views remaining");
      return;
    }
    try {
      const url = await openViewLimited({ messageId: message._id });
      if (url) {
        setRevealedUrl(url);
        toast(`${viewsRemaining - 1} view${viewsRemaining - 1 !== 1 ? "s" : ""} remaining`, { duration: 2000 });
      } else {
        toast.error("Could not open image");
      }
    } catch {
      toast.error("Failed to open");
    }
  }

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

  const translateX = showSwipeActions ? -ACTION_PANEL_WIDTH : swipeX;
  const isRightSwipe = swipeX > 0;
  const rightSwipeProgress = isRightSwipe ? Math.min(swipeX / SWIPE_THRESHOLD, 1) : 0;
  const leftSwipeProgress = !isRightSwipe && swipeX < 0
    ? Math.min(Math.abs(swipeX) / SWIPE_THRESHOLD, 1)
    : 0;

  const hasLeftActions = isOwn;

  function renderBubbleContent() {
    return (
      <div className={cn(
        "rounded-2xl px-4 py-2",
        isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
      )}>
        {message.replyTo && (
          <div className={cn(
            "rounded-lg px-3 py-2 mb-2 flex gap-0 overflow-hidden",
            isOwn ? "bg-primary-foreground/15" : "bg-background/80"
          )}>
            <div className={cn(
              "w-1 rounded-full flex-shrink-0 mr-2.5",
              isOwn ? "bg-primary-foreground/50" : "bg-primary"
            )} />
            <div className="min-w-0 flex-1">
              <p className={cn(
                "text-[13px] font-semibold leading-tight",
                isOwn ? "text-primary-foreground/90" : "text-primary"
              )}>
                {message.replyTo.senderName}
              </p>
              <p className={cn(
                "text-[13px] mt-0.5 line-clamp-3 leading-snug",
                isOwn ? "text-primary-foreground/70" : "text-foreground/60"
              )}>
                {message.replyTo.content}
              </p>
            </div>
          </div>
        )}

        {message.type === "text" && (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {message.type === "image" && isViewLimited && (
          <div className="space-y-2">
            {revealedUrl ? (
              <div className="relative">
                <img
                  src={revealedUrl}
                  alt="View-limited"
                  className="rounded-lg max-w-full max-h-64 object-cover"
                  onLoad={() => {
                    setTimeout(() => setRevealedUrl(null), 5000);
                  }}
                />
                <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                  Auto-hides in 5s
                </div>
              </div>
            ) : isExpired ? (
              <div className="flex items-center gap-2 py-3 justify-center">
                <EyeOff className="h-5 w-5 opacity-50" />
                <span className="text-sm opacity-70">Photo expired</span>
              </div>
            ) : (
              <button
                onClick={handleOpenViewLimited}
                className="w-full py-6 flex flex-col items-center gap-2 rounded-lg bg-black/20 backdrop-blur-xl hover:bg-black/30 transition-colors"
              >
                <Lock className="h-6 w-6" />
                <span className="text-sm font-medium">View photo</span>
                <span className="text-xs opacity-70 flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {viewsRemaining} view{viewsRemaining !== 1 ? "s" : ""} left
                </span>
              </button>
            )}
          </div>
        )}

        {message.type === "image" && !isViewLimited && message.fileUrl && (
          <div className="space-y-1">
            <img
              src={message.fileUrl}
              alt="Shared image"
              className="rounded-lg max-w-full max-h-64 object-cover"
            />
            {message.content && message.content !== message.fileName && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        )}

        {message.type === "file" && message.fileUrl && (
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("flex items-center gap-2 text-sm underline", isOwn ? "text-primary-foreground" : "text-foreground")}
          >
            <Download className="h-4 w-4" />
            {message.fileName ?? "Download file"}
          </a>
        )}

        <div className={cn("flex items-center gap-1 mt-1", isOwn ? "justify-end" : "justify-start")}>
          <span className={cn("text-[10px]", isOwn ? "text-primary-foreground/60" : "text-muted-foreground")}>
            {formatDistanceToNow(message.createdAt, { addSuffix: true })}
          </span>
          {message.isEdited && (
            <span className={cn("text-[10px]", isOwn ? "text-primary-foreground/60" : "text-muted-foreground")}>
              (edited)
            </span>
          )}
        </div>
      </div>
    );
  }

  function renderEditMode() {
    return (
      <div className={cn(
        "rounded-2xl px-3 py-2 border-2 border-primary/50",
        isOwn ? "bg-primary/5" : "bg-muted"
      )}>
        <textarea
          className="w-full bg-transparent text-sm resize-none outline-none min-h-[36px] text-foreground"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSaveEdit();
            }
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <div className="flex justify-end gap-1 mt-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(false)}>
            <X className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={handleSaveEdit}>
            <Check className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("group flex gap-2 relative", isOwn ? "justify-end" : "justify-start")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactionPicker(false); }}
    >
      {/* Reply icon revealed behind the message during right swipe */}
      {isRightSwipe && swipeX > 0 && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center"
          style={{ opacity: rightSwipeProgress }}
        >
          <div
            className={cn(
              "flex items-center justify-center h-8 w-8 rounded-full bg-primary/15 text-primary transition-transform",
              rightSwipeProgress >= 1 && "scale-110"
            )}
          >
            <Reply className="h-4 w-4" />
          </div>
        </div>
      )}

      {/* Message wrapper (non-sliding, holds action buttons behind) */}
      <div className="relative max-w-[75%]">
        {/* Swipe-left action buttons (behind the message) */}
        {hasLeftActions && (
          <div
            className="absolute inset-y-0 right-0 flex items-center gap-1.5 pr-2"
            style={{
              opacity: showSwipeActions ? 1 : leftSwipeProgress,
              pointerEvents: showSwipeActions ? "auto" : "none",
              transition: "opacity 0.15s",
            }}
          >
            {isOwn && message.type === "text" && (
              <button
                className="flex items-center justify-center h-9 w-9 rounded-full bg-muted text-foreground active:scale-95 transition-transform"
                onClick={handleStartEdit}
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {isOwn && (
              <button
                className="flex items-center justify-center h-9 w-9 rounded-full bg-destructive/15 text-destructive active:scale-95 transition-transform"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Sliding message content (in front of action buttons) */}
        <div
          className={cn("relative z-10 space-y-1 bg-background", isOwn && "items-end")}
          style={{
            transform: translateX !== 0 ? `translateX(${translateX}px)` : undefined,
            transition: touchRef.current?.swiping ? "none" : "transform 0.2s ease-out",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {!isOwn && (
            <p className="text-[11px] font-medium text-muted-foreground ml-3">
              {message.senderName}
            </p>
          )}

          <div className="relative">
            {editing ? renderEditMode() : renderBubbleContent()}

            {/* Actions (hover on desktop) */}
            {showActions && !editing && (
              <div className={cn("absolute top-0 flex gap-0.5", isOwn ? "-left-24" : "-right-24")}>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowReactionPicker(!showReactionPicker)}>
                  <SmilePlus className="h-3.5 w-3.5" />
                </Button>
                {onReply && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onReply(message)}>
                    <Reply className="h-3.5 w-3.5" />
                  </Button>
                )}
                {isOwn && message.type === "text" && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleStartEdit}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {isOwn && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMessage({ messageId: message._id })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}

            {showReactionPicker && (
              <div className={cn("absolute -top-10 z-10", isOwn ? "right-0" : "left-0")}>
                <ReactionPicker onSelect={(emoji) => { toggleReaction({ messageId: message._id, emoji }); setShowReactionPicker(false); }} />
              </div>
            )}
          </div>

          {/* Reactions */}
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
    </div>
  );
}
