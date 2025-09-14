"use server";

import { Pinecone } from "@pinecone-database/pinecone";

// Using your existing Pinecone credentials from the working insert.js
const PINECONE_API_KEY =
  "pcsk_4mgyRP_KxLKUbEzY3Dq1o9AMpyMa81oBRqLBKiC2cVHG1rKAH8SkeYVrJGUTk3aF7C2AWj";
const PINECONE_INDEX = "ngo-24o0m9b";
const PINECONE_HOST =
  "https://ngo-24o0m9b-24o0m9b.svc.aped-4627-b74a.pinecone.io";

// Initialize Pinecone client
const pc = new Pinecone({
  apiKey: PINECONE_API_KEY,
});

type Message = {
  role: "user" | "bot";
  content: string;
};

export async function upsertVectorStore(
  messages: Message[],
  conversationId: string
) {
  console.log(
    `Attempting to upsert ${messages.length} messages for conversationId: ${conversationId}`
  );

  try {
    const namespace = pc
      .index(PINECONE_INDEX, PINECONE_HOST)
      .namespace(conversationId);

    const recordsToUpsert = messages.map((message) => ({
      id: `${conversationId}-${Date.now()}-${Math.random()}`,
      text: message.content, // Pinecone will automatically create embeddings
      metadata: {
        role: message.role,
        timestamp: new Date().toISOString(),
      },
    }));

    console.log(
      `Prepared ${recordsToUpsert.length} documents for upsert to Pinecone.`
    );
    const result = await namespace.upsert(recordsToUpsert);
    console.log("✅ SUCCESS: Upsert to Pinecone completed.", result);
    return result;
  } catch (error) {
    console.error("❌ CRITICAL: Failed to upsert data to Pinecone.", error);
    throw error;
  }
}

export async function searchVectorStore(query: string, conversationId: string) {
  console.log(
    `Searching Pinecone for query in conversationId: ${conversationId}`
  );

  try {
    const namespace = pc
      .index(PINECONE_INDEX, PINECONE_HOST)
      .namespace(conversationId);

    // For text queries, we need to provide a vector
    const queryResponse = await namespace.query({
      topK: 5,
      includeMetadata: true,
      vector: new Array(1536).fill(0), // Placeholder vector
      filter: {
        role: { $in: ["user", "bot"] },
      },
    });

    const results = queryResponse.matches || [];

    console.log(`Found ${results.length} relevant documents in Pinecone.`);
    return results.map((match) => ({
      pageContent: match.metadata?.text as string,
      metadata: {
        role: match.metadata?.role as string,
        timestamp: match.metadata?.timestamp as string,
        similarity: match.score,
      },
    }));
  } catch (error) {
    console.error("❌ CRITICAL: Failed to search data in Pinecone.", error);
    throw error;
  }
}
