import { useEffect, useState } from "react";
import { debugService } from "@/services/debugService";

export function useMemberDebug() {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const value = await debugService.getMemberDebugEnabled();
        if (isMounted) {
          setEnabled(value);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void load();

    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ enabled: boolean }>;
      if (typeof custom.detail?.enabled === "boolean") {
        setEnabled(custom.detail.enabled);
      }
    };

    window.addEventListener("member-debug-updated", handler);

    return () => {
      isMounted = false;
      window.removeEventListener("member-debug-updated", handler);
    };
  }, []);

  return { debugEnabled: enabled, debugLoading: loading };
}