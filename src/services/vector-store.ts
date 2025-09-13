'use server';

/**
 * @fileOverview A service for interacting with a Pinecone serverless vector store.
 *
 * - upsertVectorStore - Upserts documents into the Pinecone index.
 * - searchVectorStore - Searches the Pinecone index for relevant documents.
 */

import { Pinecone } from '@pinecone-database/pinecone';

const TOP_K = 5; // Number of results to fetch

type Document = {
  role: 'user' | 'bot';
  content: string;
};

// Singleton instance of Pinecone
let pc: Pinecone | null = null;

function getPineconeClient(): Pinecone | null {
  if (!process.env.PINECONE_API_KEY) {
    console.error('PINECONE_API_KEY is not set in environment variables.');
    return null;
  }

  if (!pc) {
    pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return pc;
}

function getPineconeIndex() {
  const pineconeClient = getPineconeClient();
  if (!pineconeClient) return null;

  if (!process.env.PINECONE_INDEX) {
    console.error('PINECONE_INDEX is not set in environment variables.');
    return null;
  }
  
  // The host is required for serverless indexes
  if (!process.env.PINECONE_HOST) {
    console.error('PINECONE_HOST is not set in environment variables.');
    return null;
  }

  return pineconeClient.index({
    host: process.env.PINECONE_HOST,
    name: process.env.PINECONE_INDEX,
  });
}

export async function upsertVectorStore(
  docs: Document[],
  conversationId: string
) {
  console.log(`--- Starting upsertVectorStore process for Pinecone namespace: ${conversationId} ---`);
  const pineconeIndex = getPineconeIndex();
  if (!pineconeIndex) {
    console.error('Failed to get Pinecone index. Aborting upsert.');
    return;
  }

  try {
    const namespace = pineconeIndex.namespace(conversationId);
    console.log(`Processing ${docs.length} documents for upsert.`);

    const records = docs.map((doc, i) => ({
      id: `${conversationId}-${Date.now()}-${i}`,
      values: [], // Values are ignored, but the field is expected. Pinecone generates the vector from metadata.
      metadata: {
        // The text to be embedded should be in a field that matches the index's configuration.
        // We assume the field is named 'text' for this serverless setup.
        text: `${doc.role}: ${doc.content}`,
        role: doc.role,
      },
    }));

    if (records.length > 0) {
      await namespace.upsert(records);
      console.log(`✅ SUCCESS: Successfully upserted ${records.length} documents to Pinecone namespace '${conversationId}'.`);
    } else {
      console.log('No records were generated, nothing to upsert.');
    }
  } catch (error) {
    console.error('❌ CRITICAL: An error occurred during the Pinecone upsert process.', error);
  }
  console.log('--- Finished upsertVectorStore process ---');
}

export async function searchVectorStore(query: string, conversationId: string) {
  console.log(`--- Starting searchVectorStore process for Pinecone namespace: ${conversationId} ---`);
  const pineconeIndex = getPineconeIndex();
  if (!pineconeIndex) {
    console.error('Skipping search because Pinecone is not configured.');
    return [];
  }

  try {
    const namespace = pineconeIndex.namespace(conversationId);

    // With a serverless index that has an integrated embedding model,
    // we query by text instead of by vector.
    const results = await namespace.query({
      query, // The raw query text
      topK: TOP_K,
      includeMetadata: true,
    });

    console.log(`✅ SUCCESS: Found ${results.matches?.length || 0} results in namespace '${conversationId}'.`);

    return (
      results.matches?.map(match => ({
        // The original text is expected to be in the 'text' field of the metadata
        pageContent: (match.metadata?.text as string) || '',
        score: match.score,
      })) || []
    );
  } catch (error) {
    console.error('❌ CRITICAL: Error searching Pinecone:', error);
    return [];
  }
}
