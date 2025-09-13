'use server';

/**
 * @fileOverview A service for interacting with a ChromaDB vector store.
 *
 * - upsertVectorStore - Upserts documents into a ChromaDB collection.
 * - searchVectorStore - Searches a ChromaDB collection for relevant documents.
 */

import { ChromaClient } from 'chromadb';
import { embed } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const TOP_K = 5; // Number of results to fetch

type Document = {
  role: 'user' | 'bot';
  content: string;
};

// Singleton instance of ChromaClient
let client: ChromaClient | null = null;

function getChromaClient(): ChromaClient | null {
  if (!process.env.CHROMA_DB_URL) {
    console.error('CHROMA_DB_URL is not set in environment variables.');
    return null;
  }

  if (!client) {
    client = new ChromaClient({ path: process.env.CHROMA_DB_URL });
  }
  return client;
}

// Genkit/Google AI-based embedding function for ChromaDB
const embeddingFunction = {
  async generate(texts: string[]): Promise<number[][]> {
    const embeddings = await embed({
      embedder: googleAI.embedder('text-embedding-004'),
      content: texts,
    });
    return embeddings;
  },
};

async function getOrCreateCollection(conversationId: string) {
  const chromaClient = getChromaClient();
  if (!chromaClient) {
    throw new Error('ChromaDB client not initialized.');
  }

  try {
    const collection = await chromaClient.getCollection({
      name: conversationId,
      embeddingFunction: embeddingFunction as any, // Cast because chromadb types might not be perfectly aligned
    });
    return collection;
  } catch (error) {
    // Assuming error means not found, create it
    console.log(`Collection "${conversationId}" not found, creating it.`);
    const collection = await chromaClient.createCollection({
      name: conversationId,
      embeddingFunction: embeddingFunction as any,
    });
    return collection;
  }
}

export async function upsertVectorStore(
  docs: Document[],
  conversationId: string
) {
  console.log(`--- Starting upsertVectorStore process for ChromaDB collection: ${conversationId} ---`);
  if (!getChromaClient()) {
    console.error('Failed to get ChromaDB client. Aborting upsert.');
    return;
  }

  try {
    const collection = await getOrCreateCollection(conversationId);
    console.log(`Processing ${docs.length} documents for upsert.`);

    if (docs.length === 0) {
      console.log('No documents to upsert.');
      return;
    }

    const ids = docs.map((_, i) => `${conversationId}-${Date.now()}-${i}`);
    const metadatas = docs.map(doc => ({ role: doc.role }));
    const documents = docs.map(doc => `${doc.role}: ${doc.content}`);

    await collection.add({
      ids,
      metadatas,
      documents,
    });

    console.log(`✅ SUCCESS: Successfully upserted ${docs.length} documents to ChromaDB collection '${conversationId}'.`);
  } catch (error) {
    console.error('❌ CRITICAL: An error occurred during the ChromaDB upsert process.', error);
  }
  console.log('--- Finished upsertVectorStore process ---');
}

export async function searchVectorStore(query: string, conversationId: string) {
  console.log(`--- Starting searchVectorStore process for ChromaDB collection: ${conversationId} ---`);
  if (!getChromaClient()) {
    console.error('Skipping search because ChromaDB is not configured.');
    return [];
  }

  try {
    const collection = await getOrCreateCollection(conversationId);

    const results = await collection.query({
      nResults: TOP_K,
      queryTexts: [query],
    });

    console.log(`✅ SUCCESS: Found ${results.documents[0].length || 0} results in collection '${conversationId}'.`);

    if (!results.documents || results.documents.length === 0) {
      return [];
    }

    // Combine documents and distances (scores)
    const searchResults = results.documents[0].map((doc, index) => ({
      pageContent: doc ?? '',
      score: results.distances?.[0]?.[index] ?? 0,
    }));

    return searchResults;
  } catch (error) {
    console.error('❌ CRITICAL: Error searching ChromaDB:', error);
    return [];
  }
}
