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

let pc: Pinecone | null = null;
if (process.env.PINECONE_API_KEY) {
  pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
}

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
  if (!pc || !process.env.PINECONE_INDEX || !process.env.PINECONE_HOST) {
    console.warn("Pinecone credentials are not fully set. The vector store will not be available.");
    return null;
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
  const pineconeIndex = getPineconeIndex();
  if (!pineconeIndex) {
    console.log('Skipping upsert because Pinecone is not configured.');
    return;
  }

  try {
    console.log('Starting upsert process for', docs.length, 'documents.');
    const vectors = await Promise.all(
      docs.map(async (doc, index) => {
        const embedding = await getEmbedding(`${doc.role}: ${doc.content}`);
        if (!embedding || embedding.length === 0) {
          console.warn(`Could not generate embedding for doc: ${doc.content}`);
          return null;
        }
        return {
          id: `${conversationId}-${Date.now()}-${index}`,
          values: embedding,
          metadata: {
            text: doc.content,
            role: doc.role,
            conversationId,
          },
        };
      })
    );

    const validVectors = vectors.filter(v => v !== null);
    if (validVectors.length === 0) {
      console.log('No valid vectors to upsert.');
      return;
    }

    console.log('Upserting', validVectors.length, 'vectors to Pinecone.');
    await pineconeIndex.upsert(validVectors as any);
    console.log(`Successfully upserted ${validVectors.length} documents to Pinecone.`);
  } catch (error) {
    console.error('Error upserting to Pinecone:', error);
  }
}

export async function searchVectorStore(query: string, conversationId: string) {
  const pineconeIndex = getPineconeIndex();
  if (!pineconeIndex) {
    console.log('Skipping search because Pinecone is not configured.');
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
