'use server';

import { DataAPIClient } from '@datastax/astra-db-ts';
import { embed } from '@genkit-ai/ai';

const ASTRA_DB_ENDPOINT = process.env.ASTRA_DB_ENDPOINT || '';
const ASTRA_DB_APPLICATION_TOKEN =
  process.env.ASTRA_DB_APPLICATION_TOKEN || '';
const COLLECTION_NAME = 'nurture_talk_collection';

if (!ASTRA_DB_ENDPOINT || !ASTRA_DB_APPLICATION_TOKEN) {
  console.warn(
    'ASTRA_DB_ENDPOINT or ASTRA_DB_APPLICATION_TOKEN is not set. Vector store functionality will be disabled.'
  );
}

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_ENDPOINT);

async function getEmbedding(text: string) {
  const embedding = await embed({
    embedder: 'text-embedding-004',
    content: text,
  });
  return embedding;
}

const getCollection = async () => {
  try {
    const collections = await db.listCollections();
    const collectionExists = collections.some(c => c.name === COLLECTION_NAME);
    if (!collectionExists) {
      console.log(`Creating collection ${COLLECTION_NAME}...`);
      return await db.createCollection(COLLECTION_NAME, {
        vector: {
          dimension: 768,
          metric: 'cosine',
        },
      });
    } else {
      return db.collection(COLLECTION_NAME);
    }
  } catch (error) {
    console.error('CRITICAL: Failed to get or create collection in Astra DB.', error);
    throw new Error('Failed to connect to the vector database.');
  }
};


type Message = {
  role: 'user' | 'bot';
  content: string;
};

export async function upsertVectorStore(
  messages: Message[],
  conversationId: string
) {
  console.log(`Attempting to upsert ${messages.length} messages for conversationId: ${conversationId}`);
  if (!ASTRA_DB_ENDPOINT || !ASTRA_DB_APPLICATION_TOKEN) return;

  try {
    const collection = await getCollection();
    const documentsToUpsert = [];

    for (const message of messages) {
      const embedding = await getEmbedding(message.content);
      documentsToUpsert.push({
        _id: `${conversationId}-${Date.now()}-${Math.random()}`,
        text: message.content,
        conversationId: conversationId,
        role: message.role,
        $vector: embedding,
      });
    }

    console.log(`Prepared ${documentsToUpsert.length} documents for upsert.`);
    const result = await collection.insertMany(documentsToUpsert);
    console.log('✅ SUCCESS: Upsert to Astra DB completed.', result);
  } catch (error) {
    console.error('❌ CRITICAL: Failed to upsert data to Astra DB.', error);
  }
}

export async function searchVectorStore(query: string, conversationId: string) {
  console.log(`Searching vector store for query in conversationId: ${conversationId}`);
  if (!ASTRA_DB_ENDPOINT || !ASTRA_DB_APPLICATION_TOKEN) return [];

  try {
    const collection = await getCollection();
    const queryVector = await getEmbedding(query);

    const cursor = await collection.find(
      {
        conversationId: conversationId,
      },
      {
        sort: { $vector: queryVector },
        limit: 5,
        includeSimilarity: true,
      }
    );
    
    const results = await cursor.toArray();

    console.log(`Found ${results.length} relevant documents in Astra DB.`);
    return results.map(doc => ({
      pageContent: doc.text,
      metadata: {
        conversationId: doc.conversationId,
        role: doc.role,
        similarity: doc.$similarity,
      },
    }));
  } catch (error) {
    console.error('❌ CRITICAL: Failed to search data in Astra DB.', error);
    return [];
  }
}