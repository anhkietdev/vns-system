import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import { Portal, Dialog, Button, Snackbar, Text } from "react-native-paper";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "info" | "success" | "warning" | "error";
};

type SnackbarOptions = {
  title?: string;
  message: string;
  tone?: "info" | "success" | "warning" | "error";
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
};

type FeedbackContextValue = {
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  showSnackbar: (options: SnackbarOptions) => void;
};

const AppFeedbackContext = createContext<FeedbackContextValue | null>(null);

const toneColors = {
  info: "#0f766e",
  success: "#15803d",
  warning: "#b45309",
  error: "#b91c1c",
};

export function AppFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmOptions & { visible: boolean }>({
    visible: false,
    title: "",
    message: "",
    confirmLabel: "Xac nhan",
    cancelLabel: "Huy",
    tone: "warning",
  });
  const [snackbarState, setSnackbarState] = useState<SnackbarOptions & { visible: boolean }>({
    visible: false,
    message: "",
    tone: "info",
    duration: 4000,
  });
  const confirmResolver = useRef<((value: boolean) => void) | null>(null);

  const showConfirm = (options: ConfirmOptions) => {
    setConfirmState({
      visible: true,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel || "Xac nhan",
      cancelLabel: options.cancelLabel || "Huy",
      tone: options.tone || "warning",
    });

    return new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve;
    });
  };

  const resolveConfirm = (value: boolean) => {
    confirmResolver.current?.(value);
    confirmResolver.current = null;
    setConfirmState((current) => ({ ...current, visible: false }));
  };

  const showSnackbar = (options: SnackbarOptions) => {
    setSnackbarState({
      visible: true,
      message: options.message,
      title: options.title,
      tone: options.tone || "info",
      actionLabel: options.actionLabel,
      onAction: options.onAction,
      duration: options.duration || 4000,
    });
  };

  const contextValue = useMemo(
    () => ({ showConfirm, showSnackbar }),
    []
  );

  return (
    <AppFeedbackContext.Provider value={contextValue}>
      {children}
      <Portal>
        <Dialog
          visible={confirmState.visible}
          onDismiss={() => resolveConfirm(false)}
          style={{ borderRadius: 24 }}
        >
          <Dialog.Title style={{ color: toneColors[confirmState.tone || "warning"] }}>
            {confirmState.title}
          </Dialog.Title>
          <Dialog.Content>
            <Text>{confirmState.message}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => resolveConfirm(false)}>{confirmState.cancelLabel}</Button>
            <Button onPress={() => resolveConfirm(true)} textColor={toneColors[confirmState.tone || "warning"]}>
              {confirmState.confirmLabel}
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Snackbar
          visible={snackbarState.visible}
          onDismiss={() => setSnackbarState((current) => ({ ...current, visible: false }))}
          duration={snackbarState.duration}
          action={
            snackbarState.actionLabel
              ? {
                  label: snackbarState.actionLabel,
                  onPress: () => {
                    snackbarState.onAction?.();
                  },
                }
              : undefined
          }
          style={{ margin: 16, backgroundColor: toneColors[snackbarState.tone || "info"] }}
        >
          <Text style={{ color: "#fff" }}>
            {snackbarState.title ? `${snackbarState.title}: ` : ""}
            {snackbarState.message}
          </Text>
        </Snackbar>
      </Portal>
    </AppFeedbackContext.Provider>
  );
}

export function useAppFeedback() {
  const context = useContext(AppFeedbackContext);
  if (!context) {
    throw new Error("useAppFeedback must be used within AppFeedbackProvider");
  }
  return context;
}

export function useAppConfirm() {
  return useAppFeedback().showConfirm;
}

export function useAppSnackbar() {
  return useAppFeedback().showSnackbar;
}
