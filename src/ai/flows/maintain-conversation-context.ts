'use server';

/**
 * @fileOverview A Genkit flow to maintain conversation context using Pinecone as a vector database.
 *
 * - maintainConversationContext - A function that handles the conversation and context maintenance.
 * - MaintainConversationContextInput - The input type for the maintainConversationContext function.
 * - MaintainConversationContextOutput - The return type for the maintainConversationContext function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {Pinecone} from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
  environment: process.env.PINECONE_ENVIRONMENT!,
});
const index = pinecone.Index(process.env.PINECONE_INDEX!);

const MaintainConversationContextInputSchema = z.object({
  query: z.string().describe('The user query.'),
  conversationId: z.string().describe('The ID of the conversation.'),
});
export type MaintainConversationContextInput = z.infer<
  typeof MaintainConversationContextInputSchema
>;

const MaintainConversationContextOutputSchema = z.object({
  response: z.string().describe('The chatbot response.'),
});
export type MaintainConversationContextOutput = z.infer<
  typeof MaintainConversationContextOutputSchema
>;

export async function maintainConversationContext(
  input: MaintainConversationContextInput
): Promise<MaintainConversationContextOutput> {
  return maintainConversationContextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'maintainConversationContextPrompt',
  input: {schema: MaintainConversationContextInputSchema},
  output: {schema: MaintainConversationContextOutputSchema},
  prompt: `You are a chatbot exclusively focused on NGO activities and related topics. If a user asks anything outside this scope, respond with "Sorry, I can only answer questions about NGOs."

Answer the following query, using the context from previous turns of the conversation to provide a coherent and relevant response:

Query: {{{query}}}`,
});

const maintainConversationContextFlow = ai.defineFlow(
  {
    name: 'maintainConversationContextFlow',
    inputSchema: MaintainConversationContextInputSchema,
    outputSchema: MaintainConversationContextOutputSchema,
  },
  async input => {
    // 1. Embed the user query for vector search
    const embeddingResult = await ai.embed({text: input.query});
    const queryEmbedding = embeddingResult.embedding;

    // 2. Query Pinecone for relevant context from past turns
    const pineconeQueryResponse = await index.query({
      vector: queryEmbedding,
      topK: 5,
      filter: {
        conversationId: {$eq: input.conversationId},
      },
    });

    // 3. Prepare the prompt input with the user query and retrieved context
    const promptInput = {
      ...input,
    };

    // 4. Generate the response using the prompt
    const {output} = await prompt(promptInput);

    if (!output) {
      throw new Error('No output from prompt');
    }

    // 5. Embed the chatbot's response for storage
    const responseEmbeddingResult = await ai.embed({text: output.response});
    const responseEmbedding = responseEmbeddingResult.embedding;

    // 6. Upsert the turn information into Pinecone
    await index.upsert([
      {
        id: `${input.conversationId}-${Date.now()}`,
        values: responseEmbedding,
        metadata: {
          conversationId: input.conversationId,
          query: input.query,
          response: output.response,
        },
      },
    ]);

    return output;
  }
);
