'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating PDF reports summarizing key aspects of a conversation.
 *
 * @fileOverview
 * - generatePdfReport - A function that generates a PDF report based on the conversation history.
 * - GeneratePdfReportInput - The input type for the generatePdfReport function.
 * - GeneratePdfReportOutput - The return type for the generatePdfReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {jsPDF} from 'jspdf';

const GeneratePdfReportInputSchema = z.object({
  conversationHistory: z
    .string()
    .describe('The complete history of the conversation to be summarized.'),
});

export type GeneratePdfReportInput = z.infer<typeof GeneratePdfReportInputSchema>;

const GeneratePdfReportOutputSchema = z.object({
  pdfBase64: z
    .string()
    .describe(
      'The generated PDF report as a base64 encoded string (data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\').'  
    ),
});

export type GeneratePdfReportOutput = z.infer<typeof GeneratePdfReportOutputSchema>;

export async function generatePdfReport(input: GeneratePdfReportInput): Promise<GeneratePdfReportOutput> {
  return generatePdfReportFlow(input);
}

const summarizeConversationTool = ai.defineTool({
  name: 'summarizeConversation',
  description: 'Summarizes a conversation history, focusing on key aspects and important information.',
  inputSchema: z.object({
    conversationHistory: z
      .string()
      .describe('The complete history of the conversation to be summarized.'),
  }),
  outputSchema: z.string(),
}, async (input) => {
  const {text} = await ai.generate({
    prompt: `Summarize the following conversation, extracting the key points and relevant details:\n\n{{conversationHistory}}`,
  });
  return text;
});

const generatePdfReportFlow = ai.defineFlow(
  {
    name: 'generatePdfReportFlow',
    inputSchema: GeneratePdfReportInputSchema,
    outputSchema: GeneratePdfReportOutputSchema,
  },
  async input => {
    const summary = await summarizeConversationTool(input);

    // Generate PDF from the summary
    const pdf = new jsPDF();
    pdf.text(summary, 10, 10);
    const pdfBase64 = pdf.output('datauristring');

    return {pdfBase64};
  }
);
