"use client"

import { useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";

import { trpc } from "./trpc";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function Providers({ children }: {children: React.ReactNode}) {
	const [queryClient] = useState(() => new QueryClient({
		defaultOptions: {
			queries: {
				// Don't retry on UNAUTHORIZED — the user simply needs to log in
				retry: (failureCount, error: any) => {
					if (
						error?.data?.code === "UNAUTHORIZED" ||
						error?.shape?.data?.httpStatus === 401
					) return false;
					return failureCount < 3;
				},
			},
		},
	}))
	const [trpcClient] = useState(() => trpc.createClient({
		links: [
			httpBatchLink({
				url: `${API_URL}/trpc`,
				fetch(url, options) {
					return fetch(url, {
						...options,
						credentials: "include",
					});
				},
			}),
		],
	}));

	return (
		<QueryClientProvider client={queryClient}>
			<trpc.Provider client={trpcClient} queryClient={queryClient}>
				{children}
			</trpc.Provider>
		</QueryClientProvider>
	)
}