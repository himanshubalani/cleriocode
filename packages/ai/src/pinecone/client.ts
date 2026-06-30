import { Pinecone } from "@pinecone-database/pinecone";

let pinecone: Pinecone | null = null;

/**
 * Returns a Pinecone index handle configured for integrated embeddings.
 * Uses PINECONE_API_KEY and PINECONE_INDEX environment variables.
 */
export function getPineconeIndex() {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;

  if (!apiKey || !indexName) {
    throw new Error(
      "Missing Pinecone configuration: PINECONE_API_KEY and PINECONE_INDEX are required."
    );
  }

  if (!pinecone) {
    pinecone = new Pinecone({ apiKey });
  }

  return pinecone.index({ name: indexName });
}
