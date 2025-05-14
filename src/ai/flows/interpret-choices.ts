// src/ai/flows/interpret-choices.ts
'use server';

/**
 * @fileOverview This file contains the Genkit flow for interpreting choices in the Dual Dread text adventure game.
 *
 * It uses Gemini to evaluate choices and make the most sensible decision, occasionally incorporating hints if the player is stuck.
 *
 * - interpretChoices - A function that handles the choice interpretation process.
 * - InterpretChoicesInput - The input type for the interpretChoices function.
 * - InterpretChoicesOutput - The return type for the interpretChoices function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretChoicesInputSchema = z.object({
  sceneDescription: z.string().describe('The description of the current scene.'),
  playerChoices: z.array(z.string()).describe('The choices available to the player.'),
  geminiStuck: z.boolean().describe('Whether Gemini is stuck and needs a hint.'),
});
export type InterpretChoicesInput = z.infer<typeof InterpretChoicesInputSchema>;

const InterpretChoicesOutputSchema = z.object({
  chosenOption: z.string().describe('The option chosen by Gemini.'),
  reasoning: z.string().describe('The reasoning behind Gemini choice.'),
  hint: z.string().optional().describe('Optional hint to provide to the player if Gemini thinks the player is stuck.'),
});
export type InterpretChoicesOutput = z.infer<typeof InterpretChoicesOutputSchema>;

export async function interpretChoices(input: InterpretChoicesInput): Promise<InterpretChoicesOutput> {
  return interpretChoicesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interpretChoicesPrompt',
  input: {schema: InterpretChoicesInputSchema},
  output: {schema: InterpretChoicesOutputSchema},
  prompt: `You are an AI assistant acting as a player in a text-based adventure game. The game master will provide a description of the scene and a list of possible choices.

  Your task is to choose the most sensible option, explain your reasoning, and provide an optional hint if the other player seems stuck.

  Here's the current scene:
  {{sceneDescription}}

  Here are the available choices:
  {{#each playerChoices}}
  - {{{this}}}
  {{/each}}

  You MUST choose only one of the options above.
  You MUST set the reasoning to be a detailed explanation of the choice
  {{#if geminiStuck}}
  Since the other player is stuck, you MUST generate a hint to help them proceed. The hint should be concise and related to the current scene and choices.
  {{/if}}

  Now, choose an option and explain your reasoning. Output a JSON object with keys:
  - chosenOption: The choice selected.
  - reasoning: Your reasoning for choosing that option.
  - hint: A helpful hint if necessary, do not provide otherwise.
  `,
});

const interpretChoicesFlow = ai.defineFlow(
  {
    name: 'interpretChoicesFlow',
    inputSchema: InterpretChoicesInputSchema,
    outputSchema: InterpretChoicesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
