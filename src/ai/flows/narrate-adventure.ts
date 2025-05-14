// Define the Genkit flow for dynamic narration in the text adventure game.
'use server';
/**
 * @fileOverview Narrates the adventure, adapting to choices from both the user and Gemini.
 *
 * - narrateAdventure - A function that handles the dynamic narration of the game.
 * - NarrateAdventureInput - The input type for the narrateAdventure function.
 * - NarrateAdventureOutput - The return type for the narrateAdventure function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NarrateAdventureInputSchema = z.object({
  userChoice: z.string().describe('The player choice.'),
  geminiChoice: z.string().describe('Gemini choice.'),
  currentSceneDescription: z.string().describe('The current scene description.'),
});
export type NarrateAdventureInput = z.infer<typeof NarrateAdventureInputSchema>;

const NarrateAdventureOutputSchema = z.object({
  narration: z.string().describe('The narration of the story.'),
  sceneDescription: z.string().describe('The description of the scene.'),
  challenge: z.string().describe('A challenge for the players.'),
});
export type NarrateAdventureOutput = z.infer<typeof NarrateAdventureOutputSchema>;

export async function narrateAdventure(input: NarrateAdventureInput): Promise<NarrateAdventureOutput> {
  return narrateAdventureFlow(input);
}

const narrateAdventurePrompt = ai.definePrompt({
  name: 'narrateAdventurePrompt',
  input: {schema: NarrateAdventureInputSchema},
  output: {schema: NarrateAdventureOutputSchema},
  prompt: `You are the game master for a horror text adventure game. Your role is to narrate the story, present challenges, and adapt the narrative based on the choices from both the user and Gemini.

Current Scene Description: {{{currentSceneDescription}}}
User Choice: {{{userChoice}}}
Gemini Choice: {{{geminiChoice}}}

Based on the current scene and the choices made, continue the story by providing a narration, describing the new scene, and presenting a challenge.

Narration:
{{narration}}

Scene Description:
{{sceneDescription}}

Challenge:
{{challenge}}`,
});

const narrateAdventureFlow = ai.defineFlow(
  {
    name: 'narrateAdventureFlow',
    inputSchema: NarrateAdventureInputSchema,
    outputSchema: NarrateAdventureOutputSchema,
  },
  async input => {
    const {output} = await narrateAdventurePrompt(input);
    return output!;
  }
);
