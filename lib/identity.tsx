"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { circlesApi } from "./circles";
import { useAuth } from "./auth";
import type { ApiCircle } from "./types";

const IDENTITY_KEY = "bc_control_identity";

type ActiveIdentity =
  | { type: "user"; circle: null }
  | { type: "circle"; circle: ApiCircle };

type IdentityContextValue = {
  controllableCircles: ApiCircle[];
  activeIdentity: ActiveIdentity;
  loading: boolean;
  refreshIdentities: () => Promise<void>;
  selectUser: () => void;
  selectCircle: (circleId: string) => void;
};

const IdentityContext = createContext<IdentityContextValue | null>(null);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const [controllableCircles, setControllableCircles] = useState<ApiCircle[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSelectedCircleId(window.localStorage.getItem(IDENTITY_KEY));
  }, []);

  const refreshIdentities = useCallback(async () => {
    if (status !== "authenticated") {
      setControllableCircles([]);
      return;
    }

    setLoading(true);
    try {
      const mine = await circlesApi.list({ mine: true, limit: 100 });
      setControllableCircles(
        mine.filter(
          (circle) =>
            circle.isOwner ||
            circle.isAdmin ||
            circle.memberRole === "owner" ||
            circle.memberRole === "admin"
        )
      );
    } catch {
      setControllableCircles([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    refreshIdentities();
  }, [refreshIdentities, user?._id]);

  useEffect(() => {
    if (!selectedCircleId) return;
    if (controllableCircles.some((circle) => circle._id === selectedCircleId)) return;
    setSelectedCircleId(null);
    if (typeof window !== "undefined") window.localStorage.removeItem(IDENTITY_KEY);
  }, [controllableCircles, selectedCircleId]);

  const activeIdentity = useMemo<ActiveIdentity>(() => {
    const circle = controllableCircles.find((item) => item._id === selectedCircleId);
    return circle ? { type: "circle", circle } : { type: "user", circle: null };
  }, [controllableCircles, selectedCircleId]);

  const selectUser = useCallback(() => {
    setSelectedCircleId(null);
    if (typeof window !== "undefined") window.localStorage.removeItem(IDENTITY_KEY);
  }, []);

  const selectCircle = useCallback((circleId: string) => {
    setSelectedCircleId(circleId);
    if (typeof window !== "undefined") window.localStorage.setItem(IDENTITY_KEY, circleId);
  }, []);

  const value = useMemo<IdentityContextValue>(
    () => ({
      controllableCircles,
      activeIdentity,
      loading,
      refreshIdentities,
      selectUser,
      selectCircle,
    }),
    [activeIdentity, controllableCircles, loading, refreshIdentities, selectCircle, selectUser]
  );

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}

export function useIdentity(): IdentityContextValue {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error("useIdentity must be used within IdentityProvider");
  return ctx;
}
