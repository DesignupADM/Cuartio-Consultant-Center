'use server';
/**
 * @fileOverview This file implements a Genkit flow for matching consultants to a specific opportunity.
 *
 * - matchConsultants - A function that ranks consultants based on project requirements.
 * - MatchConsultantsInput - The input type for the matchConsultants function.
 * - MatchConsultantsOutput - The return type for the matchConsultants function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MatchConsultantsInputSchema = z.object({
  opportunityDescription: z.string().describe('The description of the project opportunity.'),
  consultants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    profession: z.string(),
    sector: z.string(),
    bio: z.string(),
    years: z.number(),
  })).describe('The list of consultants to evaluate.'),
});
export type MatchConsultantsInput = z.infer<typeof MatchConsultantsInputSchema>;

const MatchConsultantsOutputSchema = z.object({
  matches: z.array(z.object({
    consultantId: z.string(),
    matchScore: z.number().min(0).max(100).describe('A score from 0-100 indicating fit.'),
    reasoning: z.string().describe('Brief explanation of why this consultant is a match.'),
  })),
});
export type MatchConsultantsOutput = z.infer<typeof MatchConsultantsOutputSchema>;

export async function matchConsultants(
  input: MatchConsultantsInput
): Promise<MatchConsultantsOutput> {
  return matchConsultantsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'matchConsultantsPrompt',
  input: { schema: MatchConsultantsInputSchema },
  output: { schema: MatchConsultantsOutputSchema },
  prompt: `You are an expert recruitment agent for the Curatio Foundation. 
Compare the following Opportunity Description with the list of Consultants.
Rank them based on their professional experience, sector expertise, and years in the field.

Opportunity: {{{opportunityDescription}}}

Consultants to Evaluate:
{{#each consultants}}
- Name: {{{name}}} (ID: {{id}})
  Profession: {{{profession}}}
  Sector: {{{sector}}}
  Experience: {{years}} years
  Bio: {{{bio}}}
{{/each}}

Provide a match score (0-100) and a short reasoning for each.`,
});

const matchConsultantsFlow = ai.defineFlow(
  {
    name: 'matchConsultantsFlow',
    inputSchema: MatchConsultantsInputSchema,
    outputSchema: MatchConsultantsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
