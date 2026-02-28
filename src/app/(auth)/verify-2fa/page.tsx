"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Loader2, ShieldCheck, KeyRound } from "lucide-react";

const CODE_LENGTH = 6;

export default function Verify2FAPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [backupMode, setBackupMode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus the first input on mount
  useEffect(() => {
    if (!backupMode) {
      inputRefs.current[0]?.focus();
    }
  }, [backupMode]);

  const submitCode = useCallback(
    async (code: string) => {
      setError("");
      setLoading(true);

      try {
        const res = await fetch("/api/auth/2fa/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const data = await res.json();

        if (data.verified) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setError(data.error || "Invalid code. Please try again.");
          // Clear inputs
          setDigits(Array(CODE_LENGTH).fill(""));
          setBackupCode("");
          // Refocus first input after clearing
          if (!backupMode) {
            setTimeout(() => inputRefs.current[0]?.focus(), 50);
          }
        }
      } catch {
        setError("Something went wrong. Please try again.");
        setDigits(Array(CODE_LENGTH).fill(""));
        setBackupCode("");
      } finally {
        setLoading(false);
      }
    },
    [router, backupMode]
  );

  function handleDigitChange(index: number, value: string) {
    // Only allow single digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError("");

    if (digit && index < CODE_LENGTH - 1) {
      // Auto-advance to next input
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (digit && index === CODE_LENGTH - 1) {
      const code = newDigits.join("");
      if (code.length === CODE_LENGTH) {
        submitCode(code);
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      // Move back on backspace when current input is empty
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    // Focus last filled input or the next empty one
    const nextIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();

    // Auto-submit if all digits pasted
    if (pasted.length === CODE_LENGTH) {
      submitCode(newDigits.join(""));
    }
  }

  function handleBackupSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!backupCode.trim()) return;
    submitCode(backupCode.trim());
  }

  function toggleMode() {
    setBackupMode(!backupMode);
    setError("");
    setDigits(Array(CODE_LENGTH).fill(""));
    setBackupCode("");
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-lg">
      <div className="flex flex-col items-center gap-4">
        {/* Icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          {backupMode ? (
            <KeyRound className="h-7 w-7 text-primary" />
          ) : (
            <ShieldCheck className="h-7 w-7 text-primary" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-foreground">
          Two-Factor Authentication
        </h2>

        {/* Description */}
        <p className="text-center text-sm text-muted-foreground">
          {backupMode
            ? "Enter one of your backup codes"
            : "Enter the 6-digit code from your authenticator app"}
        </p>

        {/* Error */}
        {error && (
          <div className="w-full rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        {backupMode ? (
          /* Backup code input */
          <form onSubmit={handleBackupSubmit} className="w-full space-y-4">
            <input
              type="text"
              value={backupCode}
              onChange={(e) => {
                setBackupCode(e.target.value);
                setError("");
              }}
              placeholder="Enter backup code"
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-center text-base font-mono tracking-widest placeholder:text-muted-foreground placeholder:tracking-normal placeholder:font-sans focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={loading}
              autoFocus
              autoComplete="one-time-code"
            />
            <button
              type="submit"
              disabled={loading || !backupCode.trim()}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify backup code
            </button>
          </form>
        ) : (
          /* PIN digit inputs */
          <div className="flex gap-3" onPaste={handlePaste}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digits[i]}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                className="w-12 h-14 text-center text-2xl font-bold rounded-lg border border-input bg-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-colors"
                autoComplete={i === 0 ? "one-time-code" : "off"}
              />
            ))}
          </div>
        )}

        {/* Loading indicator */}
        {loading && !backupMode && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying...
          </div>
        )}

        {/* Toggle mode link */}
        <button
          type="button"
          onClick={toggleMode}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {backupMode ? "Use authenticator app instead" : "Use backup code"}
        </button>
      </div>

      {/* Sign out */}
      <div className="mt-6 pt-4 border-t border-border text-center">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
