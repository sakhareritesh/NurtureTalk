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
import fs from 'fs';
import path from 'path';

const GeneratePdfReportInputSchema = z.object({
  conversationHistory: z
    .string()
    .describe('The complete history of the conversation to be summarized.'),
  conversationId: z.string().describe('A unique identifier for the conversation.'),
});

export type GeneratePdfReportInput = z.infer<typeof GeneratePdfReportInputSchema>;

const GeneratePdfReportOutputSchema = z.object({
  filePath: z
    .string()
    .describe('The path where the generated PDF report is saved.'),
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
    // @ts-ignore
    input: { conversationHistory: input.conversationHistory }
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
    const summary = await summarizeConversationTool({ conversationHistory: input.conversationHistory });

    const pdf = new jsPDF();
    
    // Split text into lines that fit the page width
    const textLines = pdf.splitTextToSize(summary, 180);
    pdf.text(textLines, 10, 10);

    // Create pdfs directory if it doesn't exist
    const pdfsDir = path.join(process.cwd(), 'pdfs');
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir);
    }

    // Save the PDF to the /pdfs directory
    const fileName = `NurtureTalk-Report-${input.conversationId}-${Date.now()}.pdf`;
    const filePath = path.join(pdfsDir, fileName);
    
    const pdfOutput = pdf.output('arraybuffer');
    fs.writeFileSync(filePath, Buffer.from(pdfOutput));
    
    return {filePath};
  }
);
