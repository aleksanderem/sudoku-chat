import { useQuery } from "convex/react";
import { api } from "@cvx/_generated/api";
import type { Id } from "@cvx/_generated/dataModel";

interface TypingIndicatorProps {
  conversationId: Id<"conversations">;
}

export function TypingIndicator({ conversationId }: TypingIndicatorProps) {
  const typingUsers = useQuery(api.typing.getTyping, { conversationId });

  if (!typingUsers || typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => u?.name ?? "Someone");
  const text =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <div className="flex gap-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  );
}
