'use server';

/**
 * @fileOverview A service for interacting with Pinecone for vector storage and retrieval.
 *
 * - upsertVectorStore - Upserts chat messages into a Pinecone index.
 * - searchVectorStore - Searches for relevant documents in a Pinecone index based on a query.
 */

import { embed } from '@genkit-ai/ai';
import { Pinecone } from '@pinecone-database/pinecone';

const PINECONE_API_KEY = process.env.PINECONE_API_KEY || '';
const PINECONE_HOST = process.env.PINECONE_HOST || '';

if (!PINECONE_API_KEY || !PINECONE_HOST) {
  console.warn(
    'PINECONE_API_KEY or PINECONE_HOST is not set. Vector store functionality will be disabled.'
  );
}

const pc = new Pinecone({
  apiKey: PINECONE_API_KEY,
});

// The host parameter is the URL of the index, e.g. "https://<index_name>-<project_id>.svc.<environment>.pinecone.io"
// It is required for serverless indexes.
const pineconeIndex = pc.index(PINECONE_HOST);

async function getEmbedding(text: string) {
  const embedding = await embed({
    embedder: 'text-embedding-004',
    content: text,
  });
  return embedding;
}

type Message = {
  role: 'user' | 'bot';
  content: string;
};

export async function upsertVectorStore(
  messages: Message[],
  conversationId: string
) {
  console.log(`Attempting to upsert ${messages.length} messages for conversationId: ${conversationId}`);
  if (!PINECONE_API_KEY || !PINECONE_HOST) return;

  try {
    const vectorsToUpsert = [];

    for (const message of messages) {
      const embedding = await getEmbedding(message.content);
      vectorsToUpsert.push({
        id: `${conversationId}-${Date.now()}-${Math.random()}`,
        values: embedding,
        metadata: {
          text: message.content,
          role: message.role,
        },
      });
    }

    console.log(`Prepared ${vectorsToUpsert.length} documents for upsert to Pinecone.`);
    const result = await pineconeIndex.namespace(conversationId).upsert(vectorsToUpsert);
    console.log('✅ SUCCESS: Upsert to Pinecone completed.', result);
  } catch (error) {
    console.error('❌ CRITICAL: Failed to upsert data to Pinecone.', error);
  }
}

export async function searchVectorStore(query: string, conversationId: string) {
  console.log(`Searching Pinecone for query in conversationId: ${conversationId}`);
  if (!PINECONE_API_KEY || !PINECONE_HOST) return [];

  try {
    const queryVector = await getEmbedding(query);

    const queryResponse = await pineconeIndex.namespace(conversationId).query({
      topK: 5,
      vector: queryVector,
      includeMetadata: true,
    });
    
    const results = queryResponse.matches || [];

    console.log(`Found ${results.length} relevant documents in Pinecone.`);
    return results.map(match => ({
      pageContent: match.metadata?.text as string,
      metadata: {
        role: match.metadata?.role as string,
        similarity: match.score,
      },
    }));
  } catch (error) {
    console.error('❌ CRITICAL: Failed to search data in Pinecone.', error);
    return [];
  }
}
