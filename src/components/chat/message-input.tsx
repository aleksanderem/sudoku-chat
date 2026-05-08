import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import type { Id } from "@cvx/_generated/dataModel";
import { useExitPause } from "@/hooks/use-exit-pause";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, Image, X, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";

const TEXTAREA_MIN_H = 48;
const TEXTAREA_MAX_H = 200;

interface ReplyTo {
  _id: Id<"messages">;
  content: string;
  senderName: string;
}

interface MessageInputProps {
  conversationId: Id<"conversations">;
  replyTo?: ReplyTo | null;
  onCancelReply?: () => void;
}

export function MessageInput({ conversationId, replyTo, onCancelReply }: MessageInputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    name: string;
    type: string;
    storageId: Id<"_storage">;
  } | null>(null);
  const [maxViews, setMaxViews] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { pauseExit, resumeExit } = useExitPause();

  const sendMessage = useMutation(api.messages.send);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const setTyping = useMutation(api.typing.setTyping);

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0";
    const next = Math.max(TEXTAREA_MIN_H, Math.min(el.scrollHeight, TEXTAREA_MAX_H));
    el.style.height = next + "px";
    el.style.overflowY = el.scrollHeight > TEXTAREA_MAX_H ? "auto" : "hidden";
  }

  // Auto-focus textarea when replying
  useEffect(() => {
    if (replyTo) {
      textareaRef.current?.focus();
    }
  }, [replyTo]);

  // Reset textarea height after send clears text
  useEffect(() => {
    if (!text) resizeTextarea();
  }, [text]);

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content && !pendingFile) return;

    setSending(true);
    try {
      if (pendingFile) {
        const isImage = pendingFile.type.startsWith("image/");
        await sendMessage({
          conversationId,
          content: content || pendingFile.name,
          type: isImage ? "image" : "file",
          fileStorageId: pendingFile.storageId,
          fileName: pendingFile.name,
          mimeType: pendingFile.type,
          ...(isImage && maxViews !== null ? { maxViews } : {}),
          ...(replyTo ? { replyToId: replyTo._id } : {}),
        });
        setPendingFile(null);
        setMaxViews(null);
      } else {
        await sendMessage({
          conversationId,
          content,
          type: "text",
          ...(replyTo ? { replyToId: replyTo._id } : {}),
        });
      }
      setText("");
      onCancelReply?.();
      textareaRef.current?.focus();
    } catch (err) {
      console.error("Failed to send:", err);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }, [text, pendingFile, conversationId, sendMessage, replyTo, onCancelReply, maxViews]);

  function handleFileButtonClick() {
    pauseExit();
    fileInputRef.current?.click();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    resumeExit();

    if (!file) return;

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      const storageId = result.storageId as Id<"_storage">;
      setPendingFile({ name: file.name, type: file.type, storageId });
      toast.success("File ready to send");
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape" && replyTo) {
      e.stopPropagation();
      onCancelReply?.();
    }
  }

  function handleInput() {
    setTyping({ conversationId });
  }

  return (
    <div className="border-t bg-background">
      {/* Reply preview */}
      {replyTo && (
        <div className="mx-3 mt-3 mb-1 flex items-stretch gap-0 rounded-xl bg-muted overflow-hidden">
          <div className="w-1 bg-primary flex-shrink-0" />
          <div className="flex-1 min-w-0 px-4 py-3">
            <p className="text-sm font-semibold text-primary leading-tight">
              {replyTo.senderName}
            </p>
            <p className="text-sm text-foreground/70 mt-1 line-clamp-3 leading-snug">
              {replyTo.content}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="flex-shrink-0 px-3 flex items-center hover:bg-muted-foreground/10 transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      )}

      <div className="p-3">
        {/* Pending file preview */}
        {pendingFile && (
          <div className="mb-2 rounded-lg bg-muted px-3 py-2 text-sm space-y-2">
            <div className="flex items-center gap-2">
              {pendingFile.type.startsWith("image/") ? (
                <Image className="h-4 w-4 text-primary" />
              ) : (
                <Paperclip className="h-4 w-4 text-primary" />
              )}
              <span className="truncate flex-1">{pendingFile.name}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setPendingFile(null); setMaxViews(null); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>

            {pendingFile.type.startsWith("image/") && (
              <div className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Views:</span>
                <div className="flex gap-1">
                  {[null, 1, 2, 3, 5].map((v) => (
                    <button
                      key={v ?? "unlimited"}
                      onClick={() => setMaxViews(v)}
                      className={cn(
                        "px-2 py-0.5 rounded text-xs transition-colors",
                        maxViews === v
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-accent"
                      )}
                    >
                      {v === null ? "∞" : v}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
          />
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-10 w-10"
            onClick={handleFileButtonClick}
            disabled={uploading || sending}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </Button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              resizeTextarea();
            }}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={replyTo ? "Reply..." : "Type a message..."}
            disabled={sending}
            className="flex-1 resize-none rounded-2xl border bg-background px-4 py-3 text-[16px] leading-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            style={{ height: TEXTAREA_MIN_H, overflowY: "hidden" }}
          />

          <Button
            size="icon"
            className="flex-shrink-0 h-10 w-10 rounded-full"
            onClick={handleSend}
            disabled={(!text.trim() && !pendingFile) || uploading || sending}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
