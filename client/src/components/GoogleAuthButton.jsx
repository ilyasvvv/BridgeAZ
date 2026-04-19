import { useEffect, useRef, useState } from "react";
import { apiClient } from "../api/client";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
export const isGoogleAuthAvailable = !!GOOGLE_CLIENT_ID;
let googleScriptPromise;

const loadGoogleScript = () => {
  if (!GOOGLE_CLIENT_ID) {
    return Promise.reject(new Error("Google sign-in is not configured"));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById("google-identity-script");
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.google), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Google sign-in failed to load")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = "google-identity-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error("Google sign-in failed to load"));
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
};

export default function GoogleAuthButton({
  text = "continue_with",
  userType = "student",
  currentRegion = "",
  width = 360,
  containerClassName = "",
  onSuccess,
  onError
}) {
  const containerRef = useRef(null);
  const [pending, setPending] = useState(false);
  const [unavailable, setUnavailable] = useState(!GOOGLE_CLIENT_ID);

  useEffect(() => {
    let cancelled = false;

    if (!GOOGLE_CLIENT_ID) {
      setUnavailable(true);
      return undefined;
    }

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async ({ credential }) => {
            if (!credential) {
              onError?.("Google sign-in did not return a credential.");
              return;
            }

            setPending(true);
            try {
              const data = await apiClient.post("/auth/google", {
                credential,
                userType,
                currentRegion
              });
              onSuccess?.(data);
            } catch (error) {
              onError?.(error.message || "Google sign-in failed");
            } finally {
              setPending(false);
            }
          }
        });

        containerRef.current.innerHTML = "";
        const parentWidth = containerRef.current.parentElement?.clientWidth || width;
        const buttonWidth = Math.max(220, Math.min(width, parentWidth));

        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text,
          width: buttonWidth
        });
        setUnavailable(false);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setUnavailable(true);
        onError?.(error.message || "Google sign-in is unavailable right now.");
      });

    return () => {
      cancelled = true;
    };
  }, [currentRegion, onError, onSuccess, text, userType]);

  if (unavailable) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className={`flex justify-center ${containerClassName}`.trim()} />
      {pending && <p className="text-center text-xs uppercase tracking-wide text-mist">Signing in with Google...</p>}
    </div>
  );
}
