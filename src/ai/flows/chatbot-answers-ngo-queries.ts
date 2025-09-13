'use server';

/**
 * @fileOverview A chatbot that answers NGO-related queries using a vector database.
 *
 * - chatbotAnswersNGOQueries - A function that handles the chatbot conversation and responds to user queries.
 * - ChatbotAnswersNGOQueriesInput - The input type for the chatbotAnswersNGOQueries function.
 * - ChatbotAnswersNGOQueriesOutput - The return type for the chatbotAnswersNGOQueries function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatbotAnswersNGOQueriesInputSchema = z.object({
  query: z.string().describe('The user query related to NGO activities.'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'bot']),
    content: z.string(),
  })).optional().describe('The history of the conversation.'),
});
export type ChatbotAnswersNGOQueriesInput = z.infer<typeof ChatbotAnswersNGOQueriesInputSchema>;

const ChatbotAnswersNGOQueriesOutputSchema = z.object({
  response: z.string().describe('The chatbot response to the user query.'),
});
export type ChatbotAnswersNGOQueriesOutput = z.infer<typeof ChatbotAnswersNGOQueriesOutputSchema>;

export async function chatbotAnswersNGOQueries(input: ChatbotAnswersNGOQueriesInput): Promise<ChatbotAnswersNGOQueriesOutput> {
  return chatbotAnswersNGOQueriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatbotAnswersNGOQueriesPrompt',
  input: {
    schema: ChatbotAnswersNGOQueriesInputSchema,
  },
  output: {
    schema: ChatbotAnswersNGOQueriesOutputSchema,
  },
  prompt: `You are an expert AI assistant named NurtureTalk, specializing in Non-Governmental Organizations (NGOs). Your purpose is to provide comprehensive, accurate, and detailed information on all aspects of the NGO sector.

When a user asks a question, you should:
1.  **Provide a Detailed, In-Depth Answer:** Go beyond a simple definition. Explain the concept thoroughly, covering its nuances and key aspects.
2.  **Give Concrete Examples:** Use real-world or hypothetical examples to illustrate your points. This helps make complex topics easier to understand.
3.  **Maintain a Professional and Supportive Tone:** You are an expert guide, so be encouraging and clear.
4.  **Stay on Topic:** If the user asks a question outside the scope of NGOs, civil society, or related topics, politely steer them back by saying: "I am NurtureTalk, an AI assistant focused on the NGO sector. I can answer questions about topics like fundraising, governance, impact measurement, and more. How can I help you with that?"

Here is the user's query:
{{query}}

Use the conversation history to understand the context of the user's question.
{{#if conversationHistory}}
Conversation History:
{{#each conversationHistory}}
{{role}}: {{content}}
{{/each}}
{{/if}}
`,
});

const chatbotAnswersNGOQueriesFlow = ai.defineFlow(
  {
    name: 'chatbotAnswersNGOQueriesFlow',
    inputSchema: ChatbotAnswersNGOQueriesInputSchema,
    outputSchema: ChatbotAnswersNGOQueriesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
