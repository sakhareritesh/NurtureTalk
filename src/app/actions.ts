'use server';

import { ragChatFlow } from '@/ai/flows/rag-chat-flow';

type Message = {
  role: 'user' | 'bot';
  content: string;
};

export async function getChatbotResponse(
  query: string,
  conversationId: string,
  messages: Message[]
) {
  if (
    !process.env.PINECONE_API_KEY ||
    !process.env.PINECONE_HOST ||
    !process.env.PINECONE_INDEX
  ) {
    return 'The Pinecone credentials are not set in the `.env` file. Please add `PINECONE_API_KEY`, `PINECONE_HOST`, and `PINECONE_INDEX`.';
  }

  try {
    const conversationHistory = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    const response = await ragChatFlow({
      query,
      conversationId,
      conversationHistory,
    });
    return response.response;
  } catch (error) {
    console.error('Error getting chatbot response:', error);
    // This provides a user-friendly error message while logging the actual error server-side.
    return 'I seem to be having trouble connecting to the database. Please make sure your credentials in the .env file are correct and try again.';
  }
}
