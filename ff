'use server';

/**
 * @fileOverview A service for interacting with an Astra DB vector store.
 *
 * - upsertVectorStore - Upserts documents into an Astra DB collection.
 * - searchVectorStore - Searches an Astra DB collection for relevant documents.
 */

import { DataAPIClient, Db } from '@datastax/astra-db-ts';
import { embed } from '@genkit-ai/ai';

const TOP_K = 5; // Number of results to fetch
const COLLECTION_NAME = 'nurturetalk_collection';

type Document = {
  role: 'user' | 'bot';
  content: string;
};

// Singleton instance of Astra DB
let db: Db | null = null;

function getAstraDb(): Db {
  if (db) {
    return db;
  }

  const endpoint = process.env.ASTRA_DB_ENDPOINT;
  const token = process.env.ASTRA_DB_APPLICATION_TOKEN;

  if (!endpoint || !token) {
    throw new Error(
      'Astra DB credentials are not set in environment variables. Please set ASTRA_DB_ENDPOINT and ASTRA_DB_APPLICATION_TOKEN.'
    );
  }

  console.log('Attempting to connect to AstraDB...');
  const client = new DataAPIClient(token);
  db = client.db(endpoint);

  // Optional: Add a connection log to verify
  (async () => {
    try {
      await db!.listCollections();
      console.log('✅ SUCCESS: Successfully connected to AstraDB.');
    } catch (e) {
      console.error("❌ CRITICAL: Failed to connect to AstraDB on initialization.", e);
    }
  })();


  return db;
}

async function getEmbedding(text: string) {
  const embedding = await embed({
    embedder: 'text-embedding-004',
    content: text,
  });
  return embedding;
}

async function getOrCreateCollection() {
  const db = getAstraDb();
  try {
    const collections = await db.collections();
    const collectionExists = collections.some(
      (c) => c.collectionName === COLLECTION_NAME
    );

    if (collectionExists) {
      return db.collection(COLLECTION_NAME);
    }
  } catch (error) {
    // If list collections fails, it might be an older version of AstraDB, proceed to create
    console.warn("Could not list collections, proceeding to create. This may not be an error.", error);
  }


  console.log(`Collection '${COLLECTION_NAME}' not found or couldn't be verified. Creating new collection...`);
  return db.createCollection(COLLECTION_NAME, {
    vector: { dimension: 768, metric: 'cosine' },
  });
}

export async function upsertVectorStore(
  docs: Document[],
  conversationId: string
) {
  console.log(`--- Starting upsertVectorStore for conversation: ${conversationId} ---`);
  try {
    const collection = await getOrCreateCollection();

    console.log(`Processing ${docs.length} documents for upsert.`);
    if (docs.length === 0) {
      console.log('No documents to upsert.');
      return;
    }

    const documentsToInsert = await Promise.all(
      docs.map(async (doc, index) => {
        const vector = await getEmbedding(`${doc.role}: ${doc.content}`);
        const docToInsert = {
          _id: `${conversationId}-${Date.now()}-${index}`,
          $vector: vector,
          text: doc.content,
          role: doc.role,
          conversationId: conversationId,
        };
        console.log("Preparing to insert:", JSON.stringify(docToInsert, null, 2));
        return docToInsert;
      })
    );

    await collection.insertMany(documentsToInsert);
    console.log(`✅ SUCCESS: Successfully upserted ${documentsToInsert.length} documents to Astra DB.`);
  } catch (error) {
    console.error('❌ CRITICAL: An error occurred during the Astra DB upsert process.', error);
    // Re-throw the error so the caller knows something went wrong.
    throw error;
  }
}

export async function searchVectorStore(query: string, conversationId: string) {
  console.log(`--- Starting searchVectorStore for conversation: ${conversationId} ---`);
  try {
    const collection = await getOrCreateCollection();
    const queryVector = await getEmbedding(query);

    const cursor = await collection.find(
      {
        conversationId: conversationId,
      },
      {
        sort: { $vector: queryVector },
        limit: TOP_K,
        includeSimilarity: true,
      }
    );

    const results = await cursor.toArray();
    
    console.log(`✅ SUCCESS: Found ${results.length} relevant documents in conversation '${conversationId}'.`);

    return results.map((result) => ({
      pageContent: result.text as string ?? '',
      score: result.$similarity ?? 0,
    }));
  } catch (error) {
    console.error('❌ CRITICAL: Error searching Astra DB:', error);
    return [];
  }
}
