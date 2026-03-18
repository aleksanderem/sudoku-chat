# Sudoku Secret Chat

## Project Overview
Web app disguised as a Sudoku game that hides an encrypted real-time chat system. Users enter a secret digit sequence into the first empty Sudoku cells to unlock the chat. Two user types: chat-enabled (full app) and game-only (from share link, no chat access).

## Live URLs
- **Production**: https://sudoku-chat.pages.dev (Cloudflare Pages)
- **Convex Backend**: https://grand-ibis-854.convex.cloud
- **GitHub**: https://github.com/aleksanderem/sudoku-chat

## Deploy Commands
```bash
# Frontend (Cloudflare Pages)
npx vite build && CLOUDFLARE_ACCOUNT_ID=59467988874a521fb9b88b46f429fbac wrangler pages deploy dist --project-name sudoku-chat --branch main

# Backend (Convex)
npx convex dev --once

# Both
npx convex dev --once && npx vite build && CLOUDFLARE_ACCOUNT_ID=59467988874a521fb9b88b46f429fbac wrangler pages deploy dist --project-name sudoku-chat --branch main

# Dev
npm run dev  # runs vite + convex dev in parallel
```

## Stack
- React 19, TypeScript, Vite 8
- Tailwind CSS 4 (oklch colors, @theme inline)
- shadcn/ui (Radix + CVA + cn())
- Convex (real-time DB, auth, file storage, cron jobs)
- TanStack Router + React Query
- Lucide icons, Sonner toasts, date-fns
- web-push for PWA notifications

## Architecture

### Secret Sequence System
- User sets 4-8 digit code on first login (stored as SHA-256 hash server-side)
- `useSequenceDetector` hook snapshots target cells on first entry of potential sequence
- `onCellEntry` called BEFORE `setCellValue` so detector sees board pre-update
- 0 is valid digit in code (treated as erase in Sudoku but tracked by detector)
- Wrong sequences indistinguishable from normal Sudoku play

### Security / Exit Behavior
- `visibilitychange` + `window.blur` + Escape → instant switch to Sudoku via `flushSync`
- `exitPausedRef` pauses triggers during file picker (native picker causes blur)
- Chat state in React memory only (useState/useRef), never localStorage
- URL always `/play`, title always "Sudoku"

### Two User Types
- `chatEnabled !== false` → full app (Sudoku + chat). Default for normal registration.
- `chatEnabled === false` → game-only mode. Set when registering from `?game` share link.
- Game-only users: see Sudoku, multiplayer, leaderboard. NO sequence setup, NO chat.

### Hidden Settings (Developer Options style)
- Tap Hint button 8 times rapidly (works even when disabled via `onPointerDown` wrapper)
- Shows: Reset Code (requires entering current code), Log Out, Share Game link

### Auto-Delete Messages
- Every message gets `expiresAt = createdAt + TTL`
- Default TTL: 12h, max: 12h, configurable per conversation (min 1 min)
- Cron job `cleanup.purgeExpiredMessages` runs every 1 minute
- Uses index range query: `q.gt("expiresAt", 0).lte("expiresAt", now)`

### View-Limited Photos
- Sender picks max views (1, 2, 3, 5, or ∞) when attaching image
- Recipient sees blurred placeholder with lock icon + views remaining
- `openViewLimited` mutation: gets URL first, then increments viewCount
- After last view: file cleanup scheduled 30s later (not immediate)
- Frontend checks `revealedUrl` BEFORE `isExpired` to prevent flash during real-time update

### Push Notifications
- Service worker at `/sw.js` handles push events
- `convex/pushActions.ts` ("use node") sends via web-push with VAPID keys
- Notifications disguised: "New daily puzzle available!" instead of "New message"
- Push scheduled via `ctx.scheduler.runAfter(0, ...)` from message send mutation

### Convex Environment Variables
- `JWT_PRIVATE_KEY`, `JWKS` - auth tokens
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` - push notifications
- `SITE_URL` - https://sudoku-chat.pages.dev

## Key Files
- `src/components/app-shell.tsx` - orchestrator: auth → profile → sequence → sudoku/chat
- `src/hooks/use-sequence-detector.ts` - secret code detection with cell snapshot
- `src/hooks/use-sudoku-game.ts` - full game state + localStorage persistence
- `src/components/sudoku/sudoku-game.tsx` - tabs (Single Player/Challenge/Leaderboard)
- `src/components/chat/chat-layout.tsx` - sidebar + main chat area
- `convex/schema.ts` - all tables (users, conversations, messages, reactions, etc.)
- `convex/messages.ts` - send with TTL + view-limited + push notifications
- `convex/cleanup.ts` - purge expired messages + expire view-limited photos
- `convex/pushActions.ts` - "use node" action for web-push

## Gotchas
- Existing users have `chatEnabled: undefined` → treated as chat-enabled (`!== false`)
- `FormEvent` is deprecated in React 19 types (warnings are harmless)
- Convex `_generated/` must be regenerated after schema changes: `npx convex dev --once`
- For new internal functions, deploy with `--typecheck=disable` first to generate types
- iOS input zoom fix: all inputs forced to 16px font + viewport `maximum-scale=1`
- `_redirects` file must be in `public/` (Vite copies to `dist/`) for SPA routing
