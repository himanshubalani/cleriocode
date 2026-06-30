"use client"

import { trpc } from "@trpc/trpc";

export default function Health() {
	const healthQuery = trpc.health.useQuery();

	console.log(healthQuery);

	return <h1>This is health</h1>;
}