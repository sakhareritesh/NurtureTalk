'use server';

/**
 * @fileOverview A service for interacting with a Pinecone vector store.
 *
 * - upsertVectorStore - Upserts documents into the Pinecone index.
 * - searchVectorStore - Searches the Pinecone index for relevant documents.
 */

import { Pinecone } from '@pinecone-database/pinecone';
import {
  PredictionServiceClient,
} from '@google-cloud/aiplatform';

const TOP_K = 5; // Number of results to fetch

type Document = {
  role: 'user' | 'bot';
  content: string;
};

// Singleton instance of Pinecone
let pc: Pinecone | null = null;

// Initialize Google AI Platform client for embeddings
const clientOptions = {
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
};
const predictionServiceClient = new PredictionServiceClient(clientOptions);

async function getEmbedding(
  text: string
): Promise<number[] | null | undefined> {
  const [response] = await predictionServiceClient.predict({
    endpoint:
      'projects/studio-api-project-10002/locations/us-central1/publishers/google/models/text-embedding-004',
    instances: [{ content: text }],
  });

  return response.predictions?.[0]?.structValue?.fields?.embeddings?.structValue
    ?.fields?.values?.listValue?.values?.map(v => v.numberValue!);
}

function getPineconeIndex() {
  if (!process.env.PINECONE_API_KEY) {
    console.error("PINECONE_API_KEY is not set in environment variables.");
    return null;
  }
  if (!process.env.PINECONE_INDEX) {
    console.error("PINECONE_INDEX is not set in environment variables.");
    return null;
  }
  if (!process.env.PINECONE_HOST) {
    console.error("PINECONE_HOST is not set in environment variables. Please find it in your Pinecone dashboard.");
    return null;
  }
  
  if (!pc) {
    console.log('Initializing Pinecone client for the first time.');
    pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }

  return pc.index({
      host: process.env.PINECONE_HOST,
      name: process.env.PINECONE_INDEX,
  });
}

export async function upsertVectorStore(
  docs: Document[],
  conversationId: string
) {
  console.log('--- Starting upsertVectorStore process ---');
  const pineconeIndex = getPineconeIndex();
  if (!pineconeIndex) {
    console.error('Failed to get Pinecone index. Aborting upsert.');
    return;
  }

  try {
    console.log(`Processing ${docs.length} documents for conversation ID: ${conversationId}`);
    
    const vectors = [];
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      const docText = `${doc.role}: ${doc.content}`;
      console.log(`[${i + 1}/${docs.length}] Generating embedding for: "${doc.content.substring(0, 50)}..."`);
      
      let embedding;
      try {
        embedding = await getEmbedding(docText);
      } catch (embeddingError) {
        console.error(`ERROR: Failed to generate embedding for document ${i + 1}.`, embeddingError);
        continue; // Skip this document and move to the next
      }

      if (!embedding || embedding.length === 0) {
        console.warn(`WARNING: Could not generate a valid embedding for doc: "${doc.content.substring(0, 50)}...". Skipping.`);
        continue;
      }

      vectors.push({
        id: `${conversationId}-${Date.now()}-${i}`,
        values: embedding,
        metadata: {
          text: doc.content,
          role: doc.role,
          conversationId,
        },
      });
      console.log(`[${i + 1}/${docs.length}] Successfully created vector.`);
    }

    if (vectors.length === 0) {
      console.warn('WARNING: No valid vectors were created. Nothing to upsert.');
      console.log('--- Finished upsertVectorStore process (with no data to save) ---');
      return;
    }

    console.log(`Attempting to upsert ${vectors.length} vectors to Pinecone index '${process.env.PINECONE_INDEX}'.`);
    await pineconeIndex.upsert(vectors as any);
    console.log(`✅ SUCCESS: Successfully upserted ${vectors.length} documents to Pinecone.`);

  } catch (error) {
    console.error('❌ CRITICAL: An error occurred during the Pinecone upsert process.', error);
  }
  console.log('--- Finished upsertVectorStore process ---');
}

export async function searchVectorStore(query: string, conversationId: string) {
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

    const results = await pineconeIndex.query({
      vector: queryEmbedding,
      topK: TOP_K,
      filter: {
        conversationId: { $eq: conversationId },
      },
      includeMetadata: true,
    });

    return (
      results.matches?.map(match => ({
        pageContent: (match.metadata?.text as string) || '',
        score: match.score,
      })) || []
    );
  } catch (error) {
    console.error('Error searching Pinecone:', error);
    return [];
  }
}
