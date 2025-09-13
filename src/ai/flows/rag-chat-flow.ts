'use server';

/**
 * @fileOverview A RAG-powered chatbot that uses Pinecone for long-term memory.
 *
 * - ragChatFlow - A function that handles the chatbot conversation and responds to user queries using a vector database.
 * - RagChatInput - The input type for the ragChatFlow function.
 * - RagChatOutput - The return type for the ragChatFlow function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { searchVectorStore, upsertVectorStore } from '@/services/vector-store';

const RagChatInputSchema = z.object({
  query: z.string().describe('The user query related to NGO activities.'),
  conversationId: z
    .string()
    .describe('A unique identifier for the conversation.'),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'bot']),
        content: z.string(),
      })
    )
    .optional()
    .describe('The recent history of the conversation.'),
});
export type RagChatInput = z.infer<typeof RagChatInputSchema>;

const RagChatOutputSchema = z.object({
  response: z.string().describe('The chatbot response to the user query.'),
});
export type RagChatOutput = z.infer<typeof RagChatOutputSchema>;

export async function ragChatFlow(input: RagChatInput): Promise<RagChatOutput> {
  return ragChatFlowDefinition(input);
}

const prompt = ai.definePrompt({
  name: 'ragChatPrompt',
  input: {
    schema: z.object({
      query: RagChatInputSchema.shape.query,
      context: z.string().describe('Relevant context from past conversations.'),
      conversationHistory: RagChatInputSchema.shape.conversationHistory,
    }),
  },
  output: {
    schema: RagChatOutputSchema,
  },
  prompt: `You are an expert AI assistant named NurtureTalk, specializing in Non-Governmental Organizations (NGOs). Your purpose is to provide comprehensive, accurate, and detailed information on all aspects of the NGO sector.

When a user asks a question, you should:
1.  **Provide a Detailed, In-Depth Answer:** Go beyond a simple definition. Explain the concept thoroughly, covering its nuances and key aspects.
2.  **Give Concrete Examples:** Use real-world or hypothetical examples to illustrate your points. This helps make complex topics easier to understand.
3.  **Leverage Past Conversations:** Use the provided context from previous interactions to inform your answer and maintain a coherent, long-term conversation.
4.  **Maintain a Professional and Supportive Tone:** You are an expert guide, so be encouraging and clear.
5.  **Stay on Topic:** If the user asks a question outside the scope of NGOs, civil society, or related topics, politely steer them back by saying: "I am NurtureTalk, an AI assistant focused on the NGO sector. I can answer questions about topics like fundraising, governance, impact measurement, and more. How can I help you with that?"

Use the following context from past conversations to answer the user's query:
-- CONTEXT --
{{{context}}}
-- END CONTEXT --

Here is the user's query:
{{query}}

Use the recent conversation history to understand the immediate context of the user's question.
{{#if conversationHistory}}
Recent History:
{{#each conversationHistory}}
{{role}}: {{content}}
{{/each}}
{{/if}}
`,
});

const ragChatFlowDefinition = ai.defineFlow(
  {
    name: 'ragChatFlow',
    inputSchema: RagChatInputSchema,
    outputSchema: RagChatOutputSchema,
  },
  async ({ query, conversationId, conversationHistory }) => {
    const relevantDocs = await searchVectorStore(query, conversationId);
    const context = relevantDocs.map(d => d.pageContent).join('\n\n');

    const { output } = await prompt({
      query,
      context,
      conversationHistory,
    });
    const response = output!.response;

    // Don't wait for the upsert to complete to keep the response fast.
    upsertVectorStore(
      [
        {
          role: 'user',
          content: query,
        },
        {
          role: 'bot',
          content: response,
        },
      ],
      conversationId
    );

    return { response };
  }
);
