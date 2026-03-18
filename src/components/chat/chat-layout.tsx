import { useState } from "react";
import { ConversationList } from "./conversation-list";
import { ChatView } from "./chat-view";
import { cn } from "@/lib/utils";
import type { Id } from "@cvx/_generated/dataModel";

export function ChatLayout() {
  const [activeConversationId, setActiveConversationId] = useState<Id<"conversations"> | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  function handleSelectConversation(id: Id<"conversations">) {
    setActiveConversationId(id);
    setShowSidebar(false); // Mobile: switch to chat view
  }

  function handleBack() {
    setShowSidebar(true);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div
        className={cn(
          "w-full md:w-80 lg:w-96 border-r flex-shrink-0 flex flex-col",
          !showSidebar && "hidden md:flex"
        )}
      >
        <ConversationList
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Main chat area */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0",
          showSidebar && "hidden md:flex"
        )}
      >
        {activeConversationId ? (
          <ChatView
            conversationId={activeConversationId}
            onBack={handleBack}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
