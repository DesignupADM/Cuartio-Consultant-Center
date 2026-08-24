'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateOpportunityInputSchema = z.object({
  title: z.string().describe('The project title or role name.'),
  context: z.string().optional().describe('Any additional context or bullet points to include.'),
});

const GenerateOpportunityOutputSchema = z.object({
  title: z.string(),
  contentHtml: z.string().describe('A professional project landing page formatted in semantic HTML (h2, p, ul, li).'),
  tags: z.array(z.string()).describe('Up to 5 relevant skill or sector tags.'),
  suggestedDuration: z.string().describe('A realistic duration for this type of project.'),
  suggestedRegion: z.string().describe('Commonly associated region or "Global".'),
});

export type GenerateOpportunityOutput = z.infer<typeof GenerateOpportunityOutputSchema>;

export async function generateOpportunity(input: { title: string, context?: string }): Promise<GenerateOpportunityOutput> {
  return generateOpportunityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateOpportunityPrompt',
  input: { schema: GenerateOpportunityInputSchema },
  output: { schema: GenerateOpportunityOutputSchema },
  prompt: `You are an expert recruitment and project manager for the Curatio International Foundation, which connects high-level consultants to humanitarian and infrastructure projects.

Based on the Title and optional context, generate a professional project landing page.

Title: {{{title}}}
{{#if context}}Additional Context: {{{context}}}{{/if}}

The Foundation typically works in areas like:
- International Law & Human Rights
- Infrastructure Development
- Global Health
- Sustainable Finance
- Disaster Response

Make the content compelling, professional, and clear. Format the main project description as rich semantic HTML (using <h2>, <p>, <ul>, <li>) that would fit perfectly into a WYSIWYG editor like TinyMCE. 
Include sections like "Project Overview", "Responsibilities", and "Required Qualifications". Do not wrap the HTML in markdown blocks. Suggest realistic duration and region if not evident.`,
});

const generateOpportunityFlow = ai.defineFlow(
  {
    name: 'generateOpportunityFlow',
    inputSchema: GenerateOpportunityInputSchema,
    outputSchema: GenerateOpportunityOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('Failed to generate opportunity content');
    return output;
  }
);
