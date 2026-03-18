import { useEffect, useCallback, useState, useRef } from "react";
import { flushSync } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import { Helmet } from "react-helmet-async";
import { SudokuGame } from "@/components/sudoku/sudoku-game";
import { SetupSequenceDialog } from "@/components/sudoku/setup-sequence-dialog";
import { SetupProfileDialog } from "@/components/sudoku/setup-profile-dialog";
import { ChatLayout } from "@/components/chat/chat-layout";
import { AuthScreen } from "@/components/auth/auth-screen";
import { requestNotificationPermission, showBrowserNotification } from "@/lib/notifications";

type AppMode = "sudoku" | "chat";

export function AppShell() {
  const user = useQuery(api.users.me);
  const notifications = useQuery(api.notifications.list, user ? { limit: 5 } : "skip");
  const [mode, setMode] = useState<AppMode>("sudoku");
  const modeRef = useRef<AppMode>("sudoku");
  const lastNotifRef = useRef<number>(0);
  const heartbeat = useMutation(api.users.heartbeat);

  // Keep mode ref in sync
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const exitChat = useCallback(() => {
    if (modeRef.current === "chat") {
      // Use flushSync for instant UI update - critical for security
      flushSync(() => setMode("sudoku"));
    }
  }, []);

  const enterChat = useCallback(() => {
    setMode("chat");
  }, []);

  // Security: exit chat on visibility change, blur, escape
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) exitChat();
    }
    function handleBlur() {
      exitChat();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") exitChat();
    }

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [exitChat]);

  // Heartbeat for presence (only when logged in)
  useEffect(() => {
    if (!user) return;
    heartbeat();
    const interval = setInterval(() => heartbeat(), 30_000);
    return () => clearInterval(interval);
  }, [heartbeat, user]);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Show browser notifications for new messages (disguised)
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;
    const latest = notifications[0];
    if (latest.createdAt > lastNotifRef.current && lastNotifRef.current > 0) {
      if (modeRef.current === "sudoku") {
        showBrowserNotification(latest.disguisedTitle, latest.disguisedBody);
      }
    }
    lastNotifRef.current = latest.createdAt;
  }, [notifications]);

  // Loading state
  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Not authenticated - show login
  if (user === null) {
    return <AuthScreen />;
  }

  // Profile setup (first-time user)
  if (!user.name) {
    return <SetupProfileDialog />;
  }

  // Sequence setup (no secret sequence set)
  if (!user.secretSequenceHash) {
    return <SetupSequenceDialog />;
  }

  return (
    <>
      <Helmet>
        <title>Sudoku</title>
      </Helmet>

      {mode === "sudoku" && (
        <div className="mode-enter">
          <SudokuGame onEnterChat={enterChat} />
        </div>
      )}

      {mode === "chat" && (
        <div className="mode-enter">
          <ChatLayout />
        </div>
      )}
    </>
  );
}
