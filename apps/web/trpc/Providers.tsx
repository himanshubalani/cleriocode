"use client"

import { useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";

import { trpc } from "./trpc";

const API_URL = process.env.BETTER_AUTH_URL || "http://localhost:5000";

export function Providers({ children }: {children: React.ReactNode}) {
	const [queryClient] = useState(() => new QueryClient())
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