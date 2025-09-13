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
    !process.env.ASTRA_DB_API_ENDPOINT ||
    !process.env.ASTRA_DB_APPLICATION_TOKEN
  ) {
    return 'I seem to be having trouble connecting. Please make sure your AstraDB credentials in the .env file are correct and try again.';
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
    return 'I seem to be having trouble connecting. Please make sure your AstraDB credentials in the .env file are correct and try again.';
  }
}
