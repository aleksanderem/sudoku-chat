import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import type { Id } from "@cvx/_generated/dataModel";
import { useExitPause } from "@/hooks/use-exit-pause";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, Image, X, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";

interface MessageInputProps {
  conversationId: Id<"conversations">;
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [text, setText] = useState("");
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

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content && !pendingFile) return;

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
        });
        setPendingFile(null);
        setMaxViews(null);
      } else {
        await sendMessage({
          conversationId,
          content,
          type: "text",
        });
      }
      setText("");
      textareaRef.current?.focus();
    } catch (err) {
      console.error("Failed to send:", err);
      toast.error("Failed to send message");
    }
  }, [text, pendingFile, conversationId, sendMessage]);

  function handleFileButtonClick() {
    // Pause exit triggers BEFORE opening file picker
    // (picker causes window blur / visibilitychange on mobile)
    pauseExit();
    fileInputRef.current?.click();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Resume exit triggers whether file was selected or cancelled
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
  }

  function handleInput() {
    setTyping({ conversationId });
  }

  return (
    <div className="border-t p-3">
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

          {/* View limit selector - only for images */}
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
        {/* File upload */}
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
          className="flex-shrink-0 h-9 w-9"
          onClick={handleFileButtonClick}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </Button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Type a message..."
          className="flex-1 resize-none rounded-xl border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[36px] max-h-32"
          rows={1}
        />

        {/* Send */}
        <Button
          size="icon"
          className="flex-shrink-0 h-9 w-9 rounded-full"
          onClick={handleSend}
          disabled={(!text.trim() && !pendingFile) || uploading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
