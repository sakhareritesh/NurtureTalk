'use server';

import { generatePdfReport } from '@/ai/flows/generate-pdf-reports';
import { maintainConversationContext } from '@/ai/flows/maintain-conversation-context';

type Message = {
  role: 'user' | 'bot';
  content: string;
};

export async function getChatbotResponse(query: string, conversationId: string) {
  try {
    const response = await maintainConversationContext({ query, conversationId });
    return response.response;
  } catch (error) {
    console.error('Error getting chatbot response:', error);
    // This provides a user-friendly error message while logging the actual error server-side.
    return 'I seem to be having trouble connecting. Please try again in a moment.';
  }
}

export async function generateReport(messages: Message[]) {
  const conversationHistory = messages
    .map(msg => `${msg.role === 'bot' ? 'NurtureTalk' : 'You'}: ${msg.content}`)
    .join('\n\n');
    
  try {
    const response = await generatePdfReport({ conversationHistory });
    return response.pdfBase64;
  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw new Error('Failed to generate PDF report.');
  }
}
