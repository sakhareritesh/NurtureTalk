'use server';

/**
 * @fileOverview A service for interacting with an AstraDB vector store.
 *
 * - upsertVectorStore - Upserts documents into the AstraDB collection.
 * - searchVectorStore - Searches the AstraDB collection for relevant documents.
 */

import { DataAPIClient, VectorDoc } from '@datastax/astra-db-ts';
import {
  PredictionServiceClient,
} from '@google-cloud/aiplatform';

const ASTRA_DB_COLLECTION = 'ngo_chatbot_memory';
const TOP_K = 5; // Number of results to fetch

type Document = {
  role: 'user' | 'bot';
  content: string;
};

// Function to check if credentials are set
function areCredentialsSet() {
  return (
    process.env.ASTRA_DB_API_ENDPOINT &&
    process.env.ASTRA_DB_APPLICATION_TOKEN
  );
}

// Initialize AstraDB client
const client = areCredentialsSet()
  ? new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN!)
  : null;

const db = client ? client.db(process.env.ASTRA_DB_API_ENDPOINT!) : null;
const astraCollection = db ? db.collection(ASTRA_DB_COLLECTION) : null;


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
  if (!astraCollection) {
    console.warn('AstraDB connection not available. Skipping upsert.');
    return;
  }

  try {
    const documentsToUpsert: VectorDoc[] = await Promise.all(
      docs.map(async (doc, index) => {
        const embedding = await getEmbedding(`${doc.role}: ${doc.content}`);
        return {
          _id: `${conversationId}-${Date.now()}-${index}`,
          $vector: embedding || [],
          text: doc.content,
          role: doc.role,
          conversationId,
        };
      })
    );
    
    // Filter out any documents that failed to generate an embedding
    const validDocs = documentsToUpsert.filter(d => d.$vector && d.$vector.length > 0);
    if (validDocs.length === 0) {
      console.log('No valid documents to upsert.');
      return;
    }

    await astraCollection.insertMany(validDocs);
    console.log(`Upserted ${validDocs.length} documents to AstraDB.`);
  } catch (error) {
    console.error('Error upserting to AstraDB:', error);
  }
}

export async function searchVectorStore(query: string, conversationId: string) {
  if (!astraCollection) {
    console.warn('AstraDB connection not available. Returning no results.');
    return [];
  }

  try {
    const queryEmbedding = await getEmbedding(query);

    if (!queryEmbedding) {
      return [];
    }
    
    const results = await astraCollection.find(
      {
        conversationId: { $eq: conversationId },
      },
      {
        sort: { $vector: queryEmbedding },
        limit: TOP_K,
        includeSimilarity: true,
      }
    );

    return (
      results.data?.map(doc => ({
        pageContent: doc.text as string,
        score: doc.$similarity,
      })) || []
    );
  } catch (error) {
    console.error('Error searching AstraDB:', error);
    return [];
  }
}
