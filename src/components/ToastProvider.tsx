"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type Toast = {
  id: number;
  message: string;
  type?: "success" | "error" | "info";
};

const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(
  null
);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export default function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, ...t }]);
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 3000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed z-[100] right-4 bottom-4 space-y-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`rounded px-3 py-2 text-sm shadow-md border ${
              t.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : t.type === "error"
                ? "bg-red-50 text-red-800 border-red-200"
                : "bg-gray-50 text-gray-800 border-gray-200"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
