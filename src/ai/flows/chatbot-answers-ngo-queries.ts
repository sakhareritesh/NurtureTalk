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
  prompt: `You are a chatbot exclusively designed to answer questions related to NGO activities and relevant topics.

  If the user asks a question outside of this scope, respond with: "I am sorry, but I can only answer questions related to NGO activities and relevant topics."

  Answer the following question:
  {{query}}

  If there is a conversation history use it to answer the query. The content may guide to answer the question or may not.
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
