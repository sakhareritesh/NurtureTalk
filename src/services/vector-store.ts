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

const PINECONE_NAMESPACE = 'ngo-chatbot-memory';
const TOP_K = 5; // Number of results to fetch

type Document = {
  role: 'user' | 'bot';
  content: string;
};

// Check for Pinecone credentials
if (
  !process.env.PINECONE_API_KEY ||
  !process.env.PINECONE_INDEX ||
  !process.env.PINECONE_HOST
) {
  throw new Error(
    'Pinecone API key, index name, or host is not set in environment variables.'
  );
}

// Initialize Pinecone
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const pineconeIndex = pinecone.index({
  host: process.env.PINECONE_HOST,
  name: process.env.PINECONE_INDEX,
});

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

export async function upsertVectorStore(
  docs: Document[],
  conversationId: string
) {
  try {
    const vectors = await Promise.all(
      docs.map(async doc => {
        const embedding = await getEmbedding(
          `${doc.role}: ${doc.content}`
        );
        return {
          id: `${conversationId}-${Date.now()}-${Math.random()}`,
          values: embedding || [],
          metadata: {
            text: doc.content,
            role: doc.role,
            conversationId,
          },
        };
      })
    );

    // Filter out any vectors that failed to generate an embedding
    const validVectors = vectors.filter(v => v.values.length > 0);
    if (validVectors.length === 0) {
      console.log('No valid vectors to upsert.');
      return;
    }

    await pineconeIndex.namespace(PINECONE_NAMESPACE).upsert(validVectors);
    console.log(`Upserted ${validVectors.length} vectors to Pinecone.`);
  } catch (error) {
    console.error('Error upserting to Pinecone:', error);
  }
}

export async function searchVectorStore(query: string, conversationId: string) {
  try {
    const queryEmbedding = await getEmbedding(query);

    if (!queryEmbedding) {
      return [];
    }

    const results = await pineconeIndex.namespace(PINECONE_NAMESPACE).query({
      vector: queryEmbedding,
      topK: TOP_K,
      filter: {
        conversationId: { $eq: conversationId },
      },
      includeMetadata: true,
    });

    return (
      results.matches?.map(match => ({
        pageContent:
          (match.metadata?.text as string) || '',
        score: match.score,
      })) || []
    );
  } catch (error) {
    console.error('Error searching Pinecone:', error);
    return [];
  }
}