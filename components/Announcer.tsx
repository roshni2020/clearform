"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

interface AnnounceCtx {
  /** Polite announcements for status changes (Listening, Speaking, Confirmed…). */
  announce: (message: string, options?: { assertive?: boolean; toast?: boolean }) => void;
}

const Ctx = createContext<AnnounceCtx>({ announce: () => {} });

/**
 * Global ARIA live regions. Every dynamic voice state is mirrored here so screen
 * reader users hear exactly what sighted users see.
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const announce = useCallback((message: string, options?: { assertive?: boolean; toast?: boolean }) => {
    // Clear then set so identical consecutive messages are re-announced.
    if (options?.assertive) {
      setAssertive("");
      window.setTimeout(() => setAssertive(message), 30);
    } else {
      setPolite("");
      window.setTimeout(() => setPolite(message), 30);
    }
    if (options?.toast) {
      setToast(message);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setToast(null), 3200);
    }
  }, []);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => ({ announce }), [announce]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="visually-hidden" aria-live="polite" aria-atomic="true" role="status">
        {polite}
      </div>
      <div className="visually-hidden" aria-live="assertive" aria-atomic="true" role="alert">
        {assertive}
      </div>
      {toast && (
        <div className="toast" aria-hidden="true">
          {toast}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useAnnounce() {
  return useContext(Ctx).announce;
}
