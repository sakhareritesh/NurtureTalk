'use server';

/**
 * Pinecone Vector Store Service
 *
 * - upsertVectorStore: Upserts documents into the Pinecone index.
 * - searchVectorStore: Searches the Pinecone index for relevant documents.
 */

import { Pinecone } from '@pinecone-database/pinecone';

const TOP_K = 5; // Number of results to fetch

type Document = {
  role: 'user' | 'bot';
  content: string;
};

// Singleton Pinecone client
let pc: Pinecone | null = null;

function getPineconeClient(): Pinecone | null {
  if (!process.env.PINECONE_API_KEY) {
    console.error('❌ Missing PINECONE_API_KEY in .env');
    return null;
  }

  if (!pc) {
    pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return pc;
}

function getPineconeIndex() {
  const client = getPineconeClient();
  if (!client) return null;

  if (!process.env.PINECONE_INDEX_NAME) {
    console.error('❌ Missing PINECONE_INDEX_NAME in .env');
    return null;
  }

  if (!process.env.PINECONE_HOST) {
    console.error('❌ Missing PINECONE_HOST in .env');
    return null;
  }

  return client.index({
    name: process.env.PINECONE_INDEX_NAME,
    host: process.env.PINECONE_HOST,
  });
}

export async function upsertVectorStore(docs: Document[], conversationId: string) {
  console.log(`--- [Pinecone] Upsert Started | Namespace: ${conversationId} ---`);
  const index = getPineconeIndex();
  if (!index) return;

  try {
    const namespace = index.namespace(conversationId);

    const records = docs.map((doc, i) => ({
      id: `${conversationId}-${Date.now()}-${i}`,
      // Pinecone serverless indexes with built-in embeddings allow passing text directly
      values: undefined, // not required for serverless (omit instead of empty array)
      metadata: {
        text: `${doc.role}: ${doc.content}`,
        role: doc.role,
      },
    }));

    if (records.length > 0) {
      await namespace.upsert(records);
      console.log(`✅ Upserted ${records.length} docs to namespace '${conversationId}'`);
    } else {
      console.log('⚠️ No documents to upsert.');
    }
  } catch (error) {
    console.error('❌ Pinecone upsert failed:', error);
  }
  console.log('--- [Pinecone] Upsert Finished ---');
}

export async function searchVectorStore(query: string, conversationId: string) {
  console.log(`--- [Pinecone] Search Started | Namespace: ${conversationId} ---`);
  const index = getPineconeIndex();
  if (!index) return [];

  try {
    const namespace = index.namespace(conversationId);
    const results = await namespace.query({
      query,
      topK: TOP_K,
      includeMetadata: true,
    });

    console.log(`✅ Found ${results.matches?.length || 0} results.`);

    return results.matches?.map(match => ({
      pageContent: (match.metadata?.text as string) || '',
      score: match.score,
    })) || [];
  } catch (error) {
    console.error('❌ Pinecone search failed:', error);
    return [];
  }
}
