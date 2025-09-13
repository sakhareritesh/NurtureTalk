'use server';

/**
 * @fileOverview A service for interacting with a Pinecone vector store.
 *
 * - upsertVectorStore - Upserts documents into a Pinecone index.
 * - searchVectorStore - Searches a Pinecone index for relevant documents.
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { googleAI } from '@genkit-ai/googleai';
import { embed } from 'genkit';

const TOP_K = 5; // Number of results to fetch

type Document = {
  role: 'user' | 'bot';
  content: string;
};

// Singleton instance of Pinecone
let pinecone: Pinecone | null = null;

function getPineconeClient(): Pinecone | null {
  if (!process.env.PINECONE_API_KEY) {
    console.error('PINECONE_API_KEY is not set in environment variables.');
    return null;
  }

  if (!pinecone) {
    pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return pinecone;
}

function getPineconeIndex() {
  const client = getPineconeClient();
  if (!client) {
    throw new Error('Pinecone client not initialized.');
  }

  if (!process.env.PINECONE_INDEX) {
    throw new Error('PINECONE_INDEX is not set in environment variables.');
  }
  if (!process.env.PINECONE_HOST) {
    throw new Error('PINECONE_HOST is not set in environment variables.');
  }

  return client.index({
    host: process.env.PINECONE_HOST,
    name: process.env.PINECONE_INDEX,
  });
}

async function getEmbedding(text: string) {
  const embedding = await embed({
    embedder: googleAI.embedder('text-embedding-004'),
    content: text,
  });
  return embedding;
}

export async function upsertVectorStore(
  docs: Document[],
  conversationId: string
) {
  console.log(`--- Starting upsertVectorStore for Pinecone namespace: ${conversationId} ---`);
  try {
    const index = getPineconeIndex();
    const namespace = index.namespace(conversationId);

    console.log(`Processing ${docs.length} documents for upsert.`);
    if (docs.length === 0) {
      console.log('No documents to upsert.');
      return;
    }

    const vectors = await Promise.all(
      docs.map(async (doc) => {
        const id = `${conversationId}-${Date.now()}-${Math.random()}`;
        const values = await getEmbedding(`${doc.role}: ${doc.content}`);
        const metadata = {
          role: doc.role,
          text: doc.content,
        };
        return { id, values, metadata };
      })
    );

    await namespace.upsert(vectors);
    console.log(`✅ SUCCESS: Successfully upserted ${vectors.length} documents to Pinecone namespace '${conversationId}'.`);
  } catch (error) {
    console.error('❌ CRITICAL: An error occurred during the Pinecone upsert process.', error);
  }
}

export async function searchVectorStore(query: string, conversationId: string) {
  console.log(`--- Starting searchVectorStore for Pinecone namespace: ${conversationId} ---`);
  try {
    const index = getPineconeIndex();
    const namespace = index.namespace(conversationId);

    const queryVector = await getEmbedding(query);

    const results = await namespace.query({
      topK: TOP_K,
      vector: queryVector,
      includeMetadata: true,
    });
    
    console.log(`✅ SUCCESS: Found ${results.matches?.length || 0} results in namespace '${conversationId}'.`);

    if (!results.matches) {
      return [];
    }

    return results.matches.map((match) => ({
      pageContent: match.metadata?.text as string ?? '',
      score: match.score ?? 0,
    }));
  } catch (error) {
    console.error('❌ CRITICAL: Error searching Pinecone:', error);
    return [];
  }
}
