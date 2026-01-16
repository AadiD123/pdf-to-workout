"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/AuthProvider";

interface OtpSignInApi {
  requestOtpSignIn: () => Promise<boolean>;
}

const OtpSignInContext = createContext<OtpSignInApi | null>(null);

export function useOtpSignIn(): OtpSignInApi {
  const context = useContext(OtpSignInContext);
  if (!context) {
    throw new Error("useOtpSignIn must be used within OtpSignInProvider");
  }
  return context;
}

type Step = "email" | "code";

export default function OtpSignInProvider({ children }: { children: ReactNode }) {
  const { signInWithEmailOtp, verifyEmailOtp, isLoading: authLoading } =
    useAuth();
  const resolverRef = useRef<(value: boolean) => void>(() => undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const close = useCallback((value: boolean) => {
    resolverRef.current(value);
    setIsOpen(false);
    setStep("email");
    setEmail("");
    setCode("");
    setError("");
    setIsSubmitting(false);
  }, []);

  const requestOtpSignIn = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setIsOpen(true);
      setStep("email");
      setEmail("");
      setCode("");
      setError("");
      setIsSubmitting(false);
    });
  }, []);

  const handleSendCode = async () => {
    if (authLoading) {
      setError("Checking your login status. Please try again.");
      return;
    }
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await signInWithEmailOtp(trimmed);
      setStep("code");
    } catch (err) {
      console.error("Failed to send OTP:", err);
      setError("Unable to send code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    const normalized = code.replace(/\D/g, "");
    if (!normalized) {
      setError("Enter the code from your email.");
      return;
    }
    if (normalized.length < 6 || normalized.length > 8) {
      setError("Please enter the 6–8 digit code from your email.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await verifyEmailOtp(email.trim(), normalized);
      close(true);
    } catch (err) {
      console.error("OTP verification failed:", err);
      setError("Invalid code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const value = useMemo(() => ({ requestOtpSignIn }), [requestOtpSignIn]);

  return (
    <OtpSignInContext.Provider value={value}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#242432] bg-[#15151c] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-100">Sign in</h2>
              <button
                onClick={() => close(false)}
                className="min-h-[36px] px-3 rounded-lg border border-[#2a2f3a] text-xs text-gray-300 hover:bg-[#1f232b] transition-colors"
              >
                Close
              </button>
            </div>
            <div className="mt-4 overflow-hidden">
              <div
                className={`flex w-[200%] transition-transform duration-300 ${
                  step === "code" ? "-translate-x-1/2" : "translate-x-0"
                }`}
              >
                <div className="w-1/2 pr-4">
                  <p className="text-sm text-gray-400 mb-3">
                    Enter your email to get a one-time code.
                  </p>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-[#2a2f3a] bg-[#0f1218] px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c6ff5e]"
                  />
                  <button
                    onClick={handleSendCode}
                    disabled={isSubmitting}
                    className="mt-4 w-full min-h-[44px] rounded-xl bg-[#c6ff5e] text-black font-semibold hover:bg-[#b6f54e] disabled:bg-[#3a3a48] disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? "Sending..." : "Send code"}
                  </button>
                </div>
                <div className="w-1/2 pl-4">
                  <p className="text-sm text-gray-400 mb-3">
                    Enter the code from your email.
                  </p>
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="6–8 digits"
                    className="w-full rounded-xl border border-[#2a2f3a] bg-[#0f1218] px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c6ff5e]"
                  />
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => setStep("email")}
                      className="min-h-[44px] px-4 rounded-xl border border-[#2a2f3a] text-xs text-gray-300 hover:bg-[#1f232b] transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleVerifyCode}
                      disabled={isSubmitting}
                      className="flex-1 min-h-[44px] rounded-xl bg-[#c6ff5e] text-black font-semibold hover:bg-[#b6f54e] disabled:bg-[#3a3a48] disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? "Verifying..." : "Verify"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          </div>
        </div>
      )}
    </OtpSignInContext.Provider>
  );
}


