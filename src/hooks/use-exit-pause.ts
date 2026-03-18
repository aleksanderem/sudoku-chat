import { createContext, useContext } from "react";

interface ExitPauseContext {
  pauseExit: () => void;
  resumeExit: () => void;
}

export const ExitPauseContext = createContext<ExitPauseContext>({
  pauseExit: () => {},
  resumeExit: () => {},
});

export function useExitPause() {
  return useContext(ExitPauseContext);
}
