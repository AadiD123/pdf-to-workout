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

type DialogType = "alert" | "confirm" | "prompt";

type DialogState =
  | {
      type: "alert" | "confirm";
      title?: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
    }
  | {
      type: "prompt";
      title?: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
      defaultValue?: string;
      placeholder?: string;
    };

interface DialogApi {
  alert: (message: string, options?: Partial<DialogState>) => Promise<void>;
  confirm: (message: string, options?: Partial<DialogState>) => Promise<boolean>;
  prompt: (
    message: string,
    options?: Partial<DialogState>
  ) => Promise<string | null>;
}

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within DialogProvider");
  }
  return context;
}

export default function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const resolverRef = useRef<(value: any) => void>(() => undefined);

  const closeDialog = useCallback((value: any) => {
    resolverRef.current(value);
    setDialog(null);
    setPromptValue("");
  }, []);

  const alert = useCallback<DialogApi["alert"]>((message, options = {}) => {
    return new Promise<void>((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        type: "alert",
        message,
        ...options,
      } as DialogState);
    });
  }, []);

  const confirm = useCallback<DialogApi["confirm"]>((message, options = {}) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        type: "confirm",
        message,
        ...options,
      } as DialogState);
    });
  }, []);

  const prompt = useCallback<DialogApi["prompt"]>((message, options = {}) => {
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
      setPromptValue(options.defaultValue ?? "");
      setDialog({
        type: "prompt",
        message,
        ...options,
      } as DialogState);
    });
  }, []);

  const value = useMemo(() => ({ alert, confirm, prompt }), [alert, confirm, prompt]);

  useEffect(() => {
    if (!dialog) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDialog(dialog.type === "confirm" ? false : null);
      }
      if (event.key === "Enter" && dialog.type !== "prompt") {
        closeDialog(dialog.type === "confirm" ? true : undefined);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDialog, dialog]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#242432] bg-[#15151c] p-6">
            {dialog.title && (
              <h2 className="text-xl font-bold text-gray-100 mb-2">
                {dialog.title}
              </h2>
            )}
            <p className="text-gray-300 mb-5 whitespace-pre-wrap">
              {dialog.message}
            </p>
            {dialog.type === "prompt" && (
              <input
                autoFocus
                value={promptValue}
                onChange={(event) => setPromptValue(event.target.value)}
                placeholder={dialog.placeholder}
                className="mb-5 w-full rounded-xl border border-[#2a2f3a] bg-[#0f1218] px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c6ff5e]"
              />
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              {dialog.type !== "alert" && (
                <button
                  onClick={() => closeDialog(dialog.type === "prompt" ? null : false)}
                  className="min-h-[44px] rounded-xl border border-[#242432] bg-[#1f232b] px-5 py-2 text-gray-200 font-semibold hover:bg-[#2a2f3a] transition-colors"
                >
                  {dialog.cancelLabel ?? "Cancel"}
                </button>
              )}
              <button
                onClick={() => {
                  if (dialog.type === "prompt") {
                    closeDialog(promptValue.trim());
                    return;
                  }
                  closeDialog(dialog.type === "confirm" ? true : undefined);
                }}
                className="min-h-[44px] rounded-xl bg-[#c6ff5e] px-5 py-2 text-black font-semibold hover:bg-[#b6f54e] transition-colors"
              >
                {dialog.confirmLabel ?? (dialog.type === "alert" ? "OK" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

