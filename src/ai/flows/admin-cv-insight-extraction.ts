'use server';
/**
 * @fileOverview This file implements a Genkit flow for extracting key insights from a consultant's CV.
 *
 * - adminCvInsightExtraction - A function that processes an uploaded CV to extract skills, experience, and qualifications.
 * - AdminCvInsightExtractionInput - The input type for the adminCvInsightExtraction function.
 * - AdminCvInsightExtractionOutput - The return type for the adminCvInsightExtraction function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AdminCvInsightExtractionInputSchema = z.object({
  cvDataUri: z.string().optional().describe("Base64 data URI of the CV"),
  cvUrl: z.string().optional().describe("Public URL of the CV PDF"),
});
export type AdminCvInsightExtractionInput = z.infer<typeof AdminCvInsightExtractionInputSchema>;

const AdminCvInsightExtractionOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the consultant’s CV.'),
  skills: z.array(z.string()).describe('A list of key skills extracted from the CV.'),
  experienceHighlights: z
    .array(z.string())
    .describe('A list of significant experience highlights or achievements.'),
  qualifications: z
    .array(z.string())
    .describe('A list of academic or professional qualifications.'),
});
export type AdminCvInsightExtractionOutput = z.infer<typeof AdminCvInsightExtractionOutputSchema>;

export async function adminCvInsightExtraction(
  input: AdminCvInsightExtractionInput
): Promise<AdminCvInsightExtractionOutput> {
  return adminCvInsightExtractionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractCvInsightsPrompt',
  input: { schema: AdminCvInsightExtractionInputSchema },
  output: { schema: AdminCvInsightExtractionOutputSchema },
  prompt: `You are an expert HR assistant tasked with analyzing consultant CVs.
Extract the following key information from the provided CV document:

1.  A concise summary of the consultant’s CV.
2.  A list of key skills.
3.  A list of significant experience highlights or achievements.
4.  A list of academic or professional qualifications.

Provide the information in a structured JSON format as described by the output schema.

CV Document: {{media url=cvDataUri}}`,
});

const adminCvInsightExtractionFlow = ai.defineFlow(
  {
    name: 'adminCvInsightExtractionFlow',
    inputSchema: AdminCvInsightExtractionInputSchema,
    outputSchema: AdminCvInsightExtractionOutputSchema,
  },
  async (input) => {
    let cvDataUri = input.cvDataUri;

    // If a URL is provided, fetch it and convert to data URI
    if (!cvDataUri && input.cvUrl) {
      try {
        const response = await fetch(input.cvUrl);
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        cvDataUri = `data:application/pdf;base64,${base64}`;
      } catch (error) {
        console.error("Failed to fetch CV from URL:", error);
        throw new Error("Could not retrieve CV document for analysis.");
      }
    }

    if (!cvDataUri) {
      throw new Error("No CV data provided for analysis.");
    }

    const { output } = await prompt({ ...input, cvDataUri });
    return output!;
  }
);
