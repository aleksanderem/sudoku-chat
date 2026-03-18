import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import type { Id } from "@cvx/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, Image, X } from "lucide-react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        });
        setPendingFile(null);
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
    }
  }, [text, pendingFile, conversationId, sendMessage]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
      setPendingFile({ name: file.name, type: file.type, storageId });
    } catch (err) {
      console.error("Upload failed:", err);
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
        <div className="flex items-center gap-2 mb-2 rounded-lg bg-muted px-3 py-2 text-sm">
          {pendingFile.type.startsWith("image/") ? (
            <Image className="h-4 w-4 text-primary" />
          ) : (
            <Paperclip className="h-4 w-4 text-primary" />
          )}
          <span className="truncate flex-1">{pendingFile.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setPendingFile(null)}
          >
            <X className="h-3 w-3" />
          </Button>
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
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Paperclip className="h-5 w-5" />
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
