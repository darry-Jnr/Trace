"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
  };
  removeToast: (id: string) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context.toast;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    // Stack newest notifications on top by appending to the front
    setToasts((prev) => [{ id, title, message, type, duration }, ...prev]);
  }, []);

  const toast = {
    success: (title: string, message?: string, duration?: number) => addToast("success", title, message, duration),
    error: (title: string, message?: string, duration?: number) => addToast("error", title, message, duration),
    warning: (title: string, message?: string, duration?: number) => addToast("warning", title, message, duration),
    info: (title: string, message?: string, duration?: number) => addToast("info", title, message, duration),
  };

  return (
    <ToastContext.Provider value={{ toast, removeToast, toasts }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    /* Positioned perfectly at the top center with comfortable status clearance */
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none items-center">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const autoDismissTimer = setTimeout(() => {
      handleClose();
    }, toast.duration || 4000);

    return () => clearTimeout(autoDismissTimer);
  }, [toast.duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 200); // Fluid drop action timing
  };

  // Custom cohesive brand vectors matching your system identity curves
  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return (
          <div className="w-7 h-7 rounded-[9px] bg-black text-white flex items-center justify-center shrink-0 shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        );
      case "error":
        return (
          <div className="w-7 h-7 rounded-[9px] bg-[#FF3B30] text-white flex items-center justify-center shrink-0 shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </div>
        );
      case "warning":
        return (
          <div className="w-7 h-7 rounded-[9px] bg-[#FF9500] text-white flex items-center justify-center shrink-0 shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case "info":
        return (
          <div className="w-7 h-7 rounded-[9px] bg-black text-white flex items-center justify-center shrink-0 shadow-sm">
            {/* Embedded Mini Dynamic Path Logo for Brand Info Alert */}
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="18" r="1.5" className="fill-white" />
              <path d="M6 18C6 12 18 12 18 6" />
              <circle cx="18" cy="6" r="1.5" className="fill-white" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div
      className={`
        pointer-events-auto
        w-full
        bg-white/95
        backdrop-blur-xl
        border
        border-black/[0.04]
        rounded-[16px]
        p-3.5
        flex
        items-start
        gap-3
        transition-all
        duration-300
        ease-[cubic-bezier(0.16,1,0.3,1)]
        shadow-[0_12px_30px_rgba(0,0,0,0.04),0_2px_4px_rgba(0,0,0,0.02)]
        ${isExiting ? "opacity-0 -translate-y-4 scale-95" : "opacity-100 translate-y-0 scale-100 animate-slide-down"}
      `}
    >
      {/* Dynamic Type Vector Indicator */}
      {getIcon()}

      {/* Copy Workspace */}
      <div className="flex-1 min-w-0 pr-4 select-none pt-0.5">
        <h4 className="text-[13px] font-semibold tracking-tight text-black leading-tight">
          {toast.title}
        </h4>
        {toast.message && (
          <p className="text-[12px] font-medium text-black/45 leading-normal mt-0.5 tracking-tight">
            {toast.message}
          </p>
        )}
      </div>

      {/* Dismiss Trigger */}
      <button
        onClick={handleClose}
        className="w-5 h-5 rounded-full flex items-center justify-center text-black/20 hover:text-black/50 transition-colors duration-150 mt-0.5 shrink-0"
        aria-label="Dismiss toast"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}