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
    return 'I seem to be having trouble connecting. Please make sure your Pinecone credentials in the .env file are correct and try again.';
  }
}
