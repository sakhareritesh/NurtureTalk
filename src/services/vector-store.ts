"use server";

import { Pinecone } from "@pinecone-database/pinecone";

if (!process.env.PINECONE_API_KEY) {
  throw new Error("PINECONE_API_KEY is not defined");
}

if (!process.env.PINECONE_INDEX) {
  throw new Error("PINECONE_INDEX is not defined");
}

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});


const VECTOR_DIMENSION = 768;

type Message = {
  role: "user" | "bot";
  content: string;
};

export async function upsertVectorStore(messages: Message[], conversationId: string) {
  try {
    const index = pc.index(process.env.PINECONE_INDEX);

    const vectors = messages.map((message, i) => ({
      id: `${conversationId}-${Date.now()}-${i}`,
      values: Array(VECTOR_DIMENSION).fill(1/VECTOR_DIMENSION), 
      metadata: {
        text: message.content,
        role: message.role,
        timestamp: new Date().toISOString()
      }
    }));

    await index.upsert(vectors);
    console.log("✅ Successfully stored messages in Pinecone");
    return true;
  } catch (error) {
    console.error("❌ Failed to store messages in Pinecone:", error);
    return false;
  }
}

export async function searchVectorStore(query: string, conversationId: string) {
  try {
    const index = pc.index(process.env.PINECONE_INDEX);

    const queryVector = Array(VECTOR_DIMENSION).fill(1/VECTOR_DIMENSION); 
    const searchResults = await index.query({
      vector: queryVector,
      topK: 5,
      includeMetadata: true
    });

    return searchResults.matches.map(match => match.metadata?.text || '');
  } catch (error) {
    console.error("❌ Failed to search messages in Pinecone:", error);
    return [];
  }
}