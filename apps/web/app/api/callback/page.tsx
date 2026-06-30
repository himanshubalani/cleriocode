"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * GitHub App installation callback handler.
 * After a user installs the GitHub App on their repos, GitHub redirects here
 * with ?installation_id=...&setup_action=install
 *
 * We capture the installation_id and redirect the user back to their project
 * settings where they can connect the repos.
 */
function GitHubAppCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");

  useEffect(() => {
    // Store installation_id so the project settings page can use it
    if (installationId) {
      localStorage.setItem("github_installation_id", installationId);
    }

    // Redirect back to workspaces — user can connect repos from project settings
    const timeout = setTimeout(() => {
      router.push("/workspaces");
    }, 2000);

    return () => clearTimeout(timeout);
  }, [installationId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg
            className="size-6 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">GitHub App Installed</h1>
          <p className="text-sm text-muted-foreground">
            {setupAction === "install"
              ? "Successfully installed! Redirecting you back..."
              : "Setup complete! Redirecting you back..."}
          </p>
          {installationId && (
            <p className="text-xs text-muted-foreground mt-2">
              Installation ID: {installationId}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GitHubAppCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      }
    >
      <GitHubAppCallbackContent />
    </Suspense>
  );
}
