'use server';

/**
 * @fileOverview A service for interacting with a Pinecone serverless vector store.
 *
 * - upsertVectorStore - Upserts documents into the Pinecone index.
 * - searchVectorStore - Searches the Pinecone index for relevant documents.
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { getEmbedding } from './embedding-client';

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
  console.log('--- Starting upsertVectorStore process for Pinecone ---');
  const pineconeIndex = getPineconeIndex();
  if (!pineconeIndex) {
    console.error('Failed to get Pinecone index. Aborting upsert.');
    return;
  }

  try {
    console.log(`Processing ${docs.length} documents for conversation ID (namespace): ${conversationId}`);

    const namespace = pineconeIndex.namespace(conversationId);

    const vectors = [];
    for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const docText = `${doc.role}: ${doc.content}`;
        const embedding = await getEmbedding(docText);

        if (!embedding || embedding.length === 0) {
            console.warn(`WARNING: Could not generate a valid embedding for doc: "${doc.content.substring(0, 50)}...". Skipping.`);
            continue;
        }

        vectors.push({
            id: `${conversationId}-${Date.now()}-${i}`,
            values: embedding,
            metadata: {
                text: doc.content, // Storing original content for retrieval
                role: doc.role,
            },
        });
    }

    if(vectors.length > 0) {
      await namespace.upsert(vectors);
      console.log(`✅ SUCCESS: Successfully upserted ${vectors.length} documents to Pinecone namespace '${conversationId}'.`);
    } else {
      console.log('No vectors were generated, nothing to upsert.');
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
    const queryEmbedding = await getEmbedding(query);

    if (!queryEmbedding) {
      console.error('Could not generate embedding for query.');
      return [];
    }
    
    const namespace = pineconeIndex.namespace(conversationId);

    const results = await namespace.query({
      vector: queryEmbedding,
      topK: TOP_K,
      includeMetadata: true,
    });
    
    console.log(`✅ SUCCESS: Found ${results.matches?.length || 0} results in namespace '${conversationId}'.`);

    return (
      results.matches?.map(match => ({
        pageContent: (match.metadata?.text as string) || '',
        score: match.score,
      })) || []
    );
  } catch (error) {
    console.error('❌ CRITICAL: Error searching Pinecone:', error);
    return [];
  }
}
