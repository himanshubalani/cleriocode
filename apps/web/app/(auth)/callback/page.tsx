"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // BetterAuth handles the OAuth callback automatically via the auth client.
    // After processing, redirect the user to the dashboard.
    const timeout = setTimeout(() => {
      router.push("/");
    }, 2000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      <p className="text-sm text-muted-foreground">Completing sign in...</p>
    </div>
  );
}
