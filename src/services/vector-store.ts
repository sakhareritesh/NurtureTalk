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

// Function to check if credentials are set
function areCredentialsSet() {
  return (
    process.env.PINECONE_API_KEY &&
    process.env.PINECONE_INDEX &&
    process.env.PINECONE_HOST
  );
}

let pc: Pinecone | null = null;
if (areCredentialsSet()) {
  pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
} else {
  console.warn("Pinecone credentials are not fully set. The vector store will not be available.");
}


const pineconeIndex =
  pc && process.env.PINECONE_INDEX && process.env.PINECONE_HOST
    ? pc.index({
        host: process.env.PINECONE_HOST,
        name: process.env.PINECONE_INDEX,
      })
    : null;

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
  if (!pineconeIndex) {
    console.warn('Pinecone connection not available. Skipping upsert.');
    return;
  }

  try {
    const vectors = await Promise.all(
      docs.map(async (doc, index) => {
        const embedding = await getEmbedding(`${doc.role}: ${doc.content}`);
        return {
          id: `${conversationId}-${Date.now()}-${index}`,
          values: embedding || [],
          metadata: {
            text: doc.content,
            role: doc.role,
            conversationId,
          },
        };
      })
    );

    const validVectors = vectors.filter(v => v.values && v.values.length > 0);
    if (validVectors.length === 0) {
      console.log('No valid documents to upsert.');
      return;
    }

    await pineconeIndex.upsert(validVectors);
    console.log(`Upserted ${validVectors.length} documents to Pinecone.`);
  } catch (error) {
    console.error('Error upserting to Pinecone:', error);
  }
}

export async function searchVectorStore(query: string, conversationId: string) {
  if (!pineconeIndex) {
    console.warn('Pinecone connection not available. Returning no results.');
    return [];
  }

  try {
    const queryEmbedding = await getEmbedding(query);

    if (!queryEmbedding) {
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
