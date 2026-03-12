import { createContext, useCallback, useContext, useMemo, useState } from "react";

type LoadingState = Record<string, number>;

interface GlobalLoadingContextValue {
  isLoading: boolean;
  start: (key: string) => void;
  stop: (key: string) => void;
  withLoading: <T>(key: string, fn: () => Promise<T>) => Promise<T>;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextValue | null>(null);

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LoadingState>({});

  const start = useCallback((key: string) => {
    setState((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
  }, []);

  const stop = useCallback((key: string) => {
    setState((prev) => {
      const current = prev[key] ?? 0;
      if (current <= 1) {
        const { [key]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: current - 1 };
    });
  }, []);

  const isLoading = useMemo(() => Object.keys(state).length > 0, [state]);

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

  const value = useMemo<GlobalLoadingContextValue>(
    () => ({ isLoading, start, stop, withLoading }),
    [isLoading, start, stop, withLoading]
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