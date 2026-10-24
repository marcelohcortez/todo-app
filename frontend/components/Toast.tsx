"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "./ui/cn";

export type ToastKind = "success" | "error";
type ShowToast = (message: string, kind?: ToastKind) => void;

interface Current {
  id: number;
  message: string;
  kind: ToastKind;
}

const SHOW_MS = 3500;

const ToastContext = createContext<ShowToast | null>(null);

// Shows one short message at a time, at the bottom of the screen, and hides it after a few seconds.
// Mounted once in the root layout, so it survives page changes.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Current | null>(null);
  const nextId = useRef(0);

  const show = useCallback<ShowToast>((message, kind = "success") => {
    nextId.current += 1;
    setCurrent({ id: nextId.current, message, kind });
  }, []);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), SHOW_MS);
    return () => clearTimeout(timer);
  }, [current]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 min-[721px]:bottom-6"
        aria-live="polite"
      >
        {current && (
          <div
            key={current.id}
            className={cn(
              "pointer-events-auto max-w-md rounded-xl border px-4 py-2.5 text-sm shadow-xl shadow-black/40",
              current.kind === "error"
                ? "border-danger-500/40 bg-gray-900 text-danger-200"
                : "border-gray-700 bg-gray-900 text-gray-100"
            )}
            role={current.kind === "error" ? "alert" : "status"}
          >
            {current.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

const noop: ShowToast = () => {};

// Returns the toast function. Without a provider (for example in a unit test) it does nothing.
export function useToast(): ShowToast {
  return useContext(ToastContext) ?? noop;
}
