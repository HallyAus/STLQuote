"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function LoginForm() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl") || "/dashboard";
  // Prevent open redirect — only allow relative paths (reject protocol-relative //evil.com)
  const callbackUrl = rawCallback.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/dashboard";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const verified = searchParams.get("verified") === "true";
  const resetDone = searchParams.get("reset") === "true";

  const [error, setError] = useState(
    errorParam === "AccountDisabled" || errorParam === "disabled"
      ? "Your account has been disabled. Contact your administrator."
      : errorParam === "InvalidToken"
        ? "Invalid verification link."
        : errorParam === "ExpiredToken"
          ? "Verification link has expired. Please request a new one."
          : errorParam === "OAuthAccountNotLinked"
            ? "An account with this email already exists. Sign in with your password first."
            : ""
  );
  const [successBanner] = useState(
    verified
      ? "Email verified successfully. You can now sign in."
      : resetDone
        ? "Password reset successfully. Sign in with your new password."
        : ""
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Check rate limit before attempting login
      const rlRes = await fetch("/api/auth/login", { method: "POST" });
      if (rlRes.status === 429) {
        const data = await rlRes.json();
        setError(data.error || "Too many login attempts. Please try again later.");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(
          result.error === "CredentialsSignin"
            ? "Invalid email or password"
            : result.error === "Configuration"
              ? "Unable to sign in. Please reset your password or contact support."
              : result.error
        );
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Sign in</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {successBanner && (
            <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success-foreground">
              {successBanner}
            </div>
          )}
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            autoFocus
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => signIn("microsoft-entra-id", { callbackUrl })}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#F25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
            <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
          </svg>
          Sign in with Microsoft
        </Button>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
