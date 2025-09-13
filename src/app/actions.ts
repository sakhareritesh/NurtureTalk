'use server';

import { chatbotAnswersNGOQueries } from '@/ai/flows/chatbot-answers-ngo-queries';

type Message = {
  role: 'user' | 'bot';
  content: string;
};

export async function getChatbotResponse(query: string, messages: Message[]) {
  try {
    const conversationHistory = messages.map(m => ({
      role: m.role,
      content: m.content
    }));
    const response = await chatbotAnswersNGOQueries({ query, conversationHistory });
    return response.response;
  } catch (error) {
    console.error('Error getting chatbot response:', error);
    // This provides a user-friendly error message while logging the actual error server-side.
    return 'I seem to be having trouble connecting. Please try again in a moment.';
  }
}
