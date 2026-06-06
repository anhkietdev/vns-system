import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

const FeedbackContext = createContext(null);

const toneStyles = {
  success: {
    container: "border-green-200 bg-green-50 text-green-800",
    icon: CheckCircle2,
    iconClass: "text-green-600",
    button: "bg-green-600 hover:bg-green-700",
  },
  error: {
    container: "border-red-200 bg-red-50 text-red-800",
    icon: XCircle,
    iconClass: "text-red-600",
    button: "bg-red-600 hover:bg-red-700",
  },
  warning: {
    container: "border-amber-200 bg-amber-50 text-amber-800",
    icon: AlertTriangle,
    iconClass: "text-amber-600",
    button: "bg-amber-600 hover:bg-amber-700",
  },
  info: {
    container: "border-sky-200 bg-sky-50 text-sky-800",
    icon: Info,
    iconClass: "text-sky-600",
    button: "bg-sky-600 hover:bg-sky-700",
  },
};

function ToastViewport({ toasts, dismissToast }) {
  return createPortal(
    <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[min(100vw-2rem,24rem)] flex-col gap-3">
      {toasts.map((toast) => {
        const styles = toneStyles[toast.tone] || toneStyles.info;
        const Icon = styles.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border shadow-lg ${styles.container}`}
          >
            <div className="flex gap-3 p-4">
              <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${styles.iconClass}`} />
              <div className="min-w-0 flex-1">
                {toast.title && (
                  <p className="text-sm font-semibold">{toast.title}</p>
                )}
                <p className="text-sm leading-5">{toast.message}</p>
                {toast.details?.length > 0 && (
                  <div className="mt-2 space-y-1 text-xs opacity-90">
                    {toast.details.slice(0, 3).map((detail) => (
                      <p key={detail}>{detail}</p>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-current/60 transition hover:bg-white/60 hover:text-current"
                onClick={() => dismissToast(toast.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>,
    document.body
  );
}

function ConfirmDialog({ state, onClose }) {
  if (!state.open) {
    return null;
  }

  const styles = toneStyles[state.tone] || toneStyles.warning;
  const Icon = styles.icon;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
        <div className="p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
            <Icon className={`h-6 w-6 ${styles.iconClass}`} />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">{state.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{state.message}</p>
          {state.description && (
            <p className="mt-2 text-sm leading-6 text-slate-500">{state.description}</p>
          )}
        </div>
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={() => onClose(false)}
          >
            {state.cancelLabel}
          </button>
          <button
            type="button"
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition ${styles.button}`}
            onClick={() => onClose(true)}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "",
    message: "",
    description: "",
    confirmLabel: "Xac nhan",
    cancelLabel: "Huy",
    tone: "warning",
  });
  const confirmResolver = useRef(null);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((tone, message, options = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const toast = {
      id,
      tone,
      title: options.title || "",
      message,
      details: options.details || [],
    };

    setToasts((current) => [...current, toast]);

    const duration = options.duration ?? 4000;
    window.setTimeout(() => {
      dismissToast(id);
    }, duration);
  }, [dismissToast]);

  const toast = useMemo(() => ({
    success: (message, options) => pushToast("success", message, options),
    error: (message, options) => pushToast("error", message, options),
    info: (message, options) => pushToast("info", message, options),
    warning: (message, options) => pushToast("warning", message, options),
  }), [pushToast]);

  const confirm = useCallback((options) => {
    setConfirmState({
      open: true,
      title: options?.title || "Xac nhan thao tac",
      message: options?.message || "Ban co chac muon tiep tuc?",
      description: options?.description || "",
      confirmLabel: options?.confirmLabel || "Xac nhan",
      cancelLabel: options?.cancelLabel || "Huy",
      tone: options?.tone || "warning",
    });

    return new Promise((resolve) => {
      confirmResolver.current = resolve;
    });
  }, []);

  const closeConfirm = useCallback((value) => {
    if (confirmResolver.current) {
      confirmResolver.current(value);
      confirmResolver.current = null;
    }

    setConfirmState((current) => ({ ...current, open: false }));
  }, []);

  const contextValue = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
      <ToastViewport toasts={toasts} dismissToast={dismissToast} />
      <ConfirmDialog state={confirmState} onClose={closeConfirm} />
    </FeedbackContext.Provider>
  );
}

export function useToast() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useToast must be used within FeedbackProvider");
  }
  return context.toast;
}

export function useConfirm() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useConfirm must be used within FeedbackProvider");
  }
  return context.confirm;
}
