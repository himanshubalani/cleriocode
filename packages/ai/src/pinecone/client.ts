import { Pinecone } from "@pinecone-database/pinecone";

let pinecone: Pinecone | null = null;

/**
 * Returns a Pinecone index handle configured for integrated embeddings.
 * Uses PINECONE_API_KEY and PINECONE_INDEX environment variables.
 */
export function getPineconeIndex() {
  if (!pinecone) {
    pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  }

  return pinecone.index({ name: process.env.PINECONE_INDEX! });
}
