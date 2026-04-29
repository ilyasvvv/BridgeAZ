"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import { notificationsApi, type ApiNotification } from "./notifications";
import { chatsApi, type ChatThread } from "./chats";

interface LiveContextValue {
  notifs: ApiNotification[];
  threads: ChatThread[];
  refreshNotifs: () => Promise<void>;
  refreshThreads: () => Promise<void>;
  setThreadsFast: (fast: boolean) => void;
}

const LiveContext = createContext<LiveContextValue | null>(null);

const SLOW_INTERVAL = 45000;
const FAST_INTERVAL = 12000;

export function LiveProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const enabled = status === "authenticated";

  const [notifs, setNotifs] = useState<ApiNotification[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [fastSubscribers, setFastSubscribers] = useState(0);

  const cancelled = useRef(false);

  const refreshNotifs = useCallback(async () => {
    if (!enabled) return;
    try {
      const next = await notificationsApi.list();
      if (!cancelled.current) setNotifs(next);
    } catch {
      // swallow — keep last good state
    }
  }, [enabled]);

  const refreshThreads = useCallback(async () => {
    if (!enabled) return;
    try {
      const next = await chatsApi.threads();
      if (!cancelled.current) setThreads(next);
    } catch {
      // swallow
    }
  }, [enabled]);

  // Reset state on sign-out so a new session starts clean.
  useEffect(() => {
    if (!enabled) {
      setNotifs([]);
      setThreads([]);
    }
  }, [enabled]);

  useEffect(() => {
    cancelled.current = false;
    if (!enabled) return;

    let notifTimer: ReturnType<typeof setInterval> | null = null;
    let threadTimer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      refreshNotifs();
      refreshThreads();
      notifTimer = setInterval(refreshNotifs, SLOW_INTERVAL);
      threadTimer = setInterval(
        refreshThreads,
        fastSubscribers > 0 ? FAST_INTERVAL : SLOW_INTERVAL
      );
    };
    const stop = () => {
      if (notifTimer) clearInterval(notifTimer);
      if (threadTimer) clearInterval(threadTimer);
      notifTimer = null;
      threadTimer = null;
    };

    const onVis = () => {
      if (document.hidden) stop();
      else {
        stop();
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled.current = true;
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, fastSubscribers, refreshNotifs, refreshThreads]);

  const setThreadsFast = useCallback((fast: boolean) => {
    setFastSubscribers((n) => Math.max(0, n + (fast ? 1 : -1)));
  }, []);

  const value = useMemo<LiveContextValue>(
    () => ({ notifs, threads, refreshNotifs, refreshThreads, setThreadsFast }),
    [notifs, threads, refreshNotifs, refreshThreads, setThreadsFast]
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveContextValue {
  const ctx = useContext(LiveContext);
  if (!ctx) {
    throw new Error("useLive must be used inside LiveProvider");
  }
  return ctx;
}

export function useThreadsFast(active: boolean) {
  const { setThreadsFast } = useLive();
  useEffect(() => {
    if (!active) return;
    setThreadsFast(true);
    return () => setThreadsFast(false);
  }, [active, setThreadsFast]);
}
