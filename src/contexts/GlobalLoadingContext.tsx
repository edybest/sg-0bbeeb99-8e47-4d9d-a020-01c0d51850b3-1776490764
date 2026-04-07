import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type LoadingState = Record<string, number>;

interface GlobalLoadingContextValue {
  isLoading: boolean;
  progress: number;
  start: (key: string) => void;
  stop: (key: string) => void;
  withLoading: <T>(key: string, fn: () => Promise<T>) => Promise<T>;
  forceStop: () => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextValue | null>(null);

const MAX_LOADING_TIME = 5000;

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LoadingState>({});
  const [progress, setProgress] = useState(0);
  const emergencyTimeoutRef = useRef<NodeJS.Timeout>();
  const progressIntervalRef = useRef<NodeJS.Timeout>();

  const start = useCallback((key: string) => {
    setState((prev) => {
      const newState = { ...prev, [key]: (prev[key] ?? 0) + 1 };
      console.log("🟡 Loading START:", key, "State:", newState);
      return newState;
    });

    // Reset progress when starting new loading
    setProgress(0);

    // Start progress animation
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    let currentProgress = 0;
    progressIntervalRef.current = setInterval(() => {
      currentProgress += Math.random() * 8 + 2; // Random increment between 2-10%
      
      // Slow down as we approach 90%
      if (currentProgress > 70) {
        currentProgress += Math.random() * 3;
      }
      
      // Cap at 90% - only reach 100% when actually done
      if (currentProgress >= 90) {
        currentProgress = 90;
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      }
      
      setProgress(Math.min(currentProgress, 90));
    }, 200);

    // Reset emergency timeout on every new start
    if (emergencyTimeoutRef.current) {
      clearTimeout(emergencyTimeoutRef.current);
    }
    emergencyTimeoutRef.current = setTimeout(() => {
      console.error(`🚨 EMERGENCY: Forcing loading stop after ${MAX_LOADING_TIME/1000}s timeout`);
      setState({});
      setProgress(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }, MAX_LOADING_TIME);
  }, []);

  const stop = useCallback((key: string) => {
    setState((prev) => {
      const current = prev[key] ?? 0;
      if (current <= 1) {
        const { [key]: _removed, ...rest } = prev;
        console.log("🟢 Loading STOP:", key, "Remaining:", Object.keys(rest));
        
        // If no more loading states, complete the progress
        if (Object.keys(rest).length === 0) {
          setProgress(100);
          
          // Clear progress after a short delay to show 100%
          setTimeout(() => {
            setProgress(0);
          }, 300);
          
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
        }
        
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
    setProgress(0);
    if (emergencyTimeoutRef.current) {
      clearTimeout(emergencyTimeoutRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Force stop loading when tab becomes visible after being hidden
  useEffect(() => {
    let hiddenTime = 0;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenTime = Date.now();
      } else {
        const timeHidden = Date.now() - hiddenTime;
        if (timeHidden > 3000) {
          console.warn("⚠️ Tab returned from background - force clearing loading state");
          forceStop();
        }
      }
    };

    const handleFocus = () => forceStop();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [forceStop]);

  const value = useMemo<GlobalLoadingContextValue>(
    () => ({ isLoading, progress, start, stop, withLoading, forceStop }),
    [isLoading, progress, start, stop, withLoading, forceStop]
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