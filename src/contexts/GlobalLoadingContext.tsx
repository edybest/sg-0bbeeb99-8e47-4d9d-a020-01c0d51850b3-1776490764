import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type LoadingState = Record<string, number>;

interface GlobalLoadingContextValue {
  isLoading: boolean;
  start: (key: string) => void;
  stop: (key: string) => void;
  withLoading: <T>(key: string, fn: () => Promise<T>) => Promise<T>;
  forceStop: () => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextValue | null>(null);

const MAX_LOADING_TIME = 5000; // Reduced to 5 seconds emergency timeout

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LoadingState>({});
  const emergencyTimeoutRef = useRef<NodeJS.Timeout>();

  const start = useCallback((key: string) => {
    setState((prev) => {
      const newState = { ...prev, [key]: (prev[key] ?? 0) + 1 };
      console.log("🟡 Loading START:", key, "State:", newState);
      return newState;
    });

    // Reset emergency timeout on every new start to prevent permanent freezing
    if (emergencyTimeoutRef.current) {
      clearTimeout(emergencyTimeoutRef.current);
    }
    emergencyTimeoutRef.current = setTimeout(() => {
      console.error(`🚨 EMERGENCY: Forcing loading stop after ${MAX_LOADING_TIME/1000}s timeout`);
      setState({});
    }, MAX_LOADING_TIME);
  }, []);

  const stop = useCallback((key: string) => {
    setState((prev) => {
      const current = prev[key] ?? 0;
      if (current <= 1) {
        const { [key]: _removed, ...rest } = prev;
        console.log("🟢 Loading STOP:", key, "Remaining:", Object.keys(rest));
        return rest;
      }
      const newState = { ...prev, [key]: current - 1 };
      console.log("🟡 Loading DECREMENT:", key, "State:", newState);
      return newState;
    });
  }, []);

  const forceStop = useCallback(() => {
    console.warn("⚠️ Force stopping all loading states");
    setState({});
    if (emergencyTimeoutRef.current) {
      clearTimeout(emergencyTimeoutRef.current);
    }
  }, []);

  const isLoading = useMemo(() => {
    const loading = Object.keys(state).length > 0;
    if (loading && process.env.NODE_ENV !== "production") {
      console.log("🔄 Loading active for:", Object.keys(state));
    }
    return loading;
  }, [state]);

  const withLoading = useCallback(
    async <T,>(key: string, fn: () => Promise<T>): Promise<T> => {
      start(key);
      try {
        return await fn();
      } finally {
        stop(key);
      }
    },
    [start, stop]
  );

  // Cleanup emergency timeout on unmount
  useEffect(() => {
    return () => {
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
      }
    };
  }, []);

  // Force stop loading when tab becomes visible after being hidden for long time
  useEffect(() => {
    let hiddenTime = 0;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenTime = Date.now();
      } else {
        // Tab became visible
        const timeHidden = Date.now() - hiddenTime;
        if (timeHidden > 3000) {
          // If tab was hidden for > 3s, force clear loading state
          // to prevent UI locking from broken async chains
          console.warn("⚠️ Tab returned from background - force clearing loading state to prevent freezes");
          forceStop();
        }
      }
    };

    // Also clear loading state on window focus as a fallback
    const handleFocus = () => forceStop();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [forceStop]);

  const value = useMemo<GlobalLoadingContextValue>(
    () => ({ isLoading, start, stop, withLoading, forceStop }),
    [isLoading, start, stop, withLoading, forceStop]
  );

  return <GlobalLoadingContext.Provider value={value}>{children}</GlobalLoadingContext.Provider>;
}

export function useGlobalLoading() {
  const ctx = useContext(GlobalLoadingContext);
  if (!ctx) {
    throw new Error("useGlobalLoading must be used within GlobalLoadingProvider");
  }
  return ctx;
}