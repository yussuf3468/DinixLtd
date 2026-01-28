import { createContext, useContext, useState, ReactNode } from "react";
import Toast, { ToastType } from "../components/Toast";

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    duration: number;
  } | null>(null);

  const showToast = (
    message: string,
    type: ToastType = "info",
    duration = 4000
  ) => {
    setToast({ message, type, duration });
  };

  const success = (message: string, duration = 4000) => {
    showToast(message, "success", duration);
  };

  const error = (message: string, duration = 5000) => {
    showToast(message, "error", duration);
  };

  const warning = (message: string, duration = 4000) => {
    showToast(message, "warning", duration);
  };

  const info = (message: string, duration = 4000) => {
    showToast(message, "info", duration);
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => setToast(null)}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
