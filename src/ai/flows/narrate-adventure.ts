// src/ai/flows/narrate-adventure.ts
'use server';
/**
 * @fileOverview Narrates the adventure, adapting to choices from both the user and Gemini, and manages health.
 *
 * - narrateAdventure - A function that handles the dynamic narration of the game.
 * - NarrateAdventureInput - The input type for the narrateAdventure function.
 * - NarrateAdventureOutput - The return type for the narrateAdventure function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NarrateAdventureInputSchema = z.object({
  userChoice: z.string().describe('The player choice.'),
  geminiChoice: z.string().describe("Gemini's choice."),
  currentSceneDescription: z.string().describe('The current scene description.'),
  playerHealth: z.number().describe("Current player health."),
  geminiHealth: z.number().describe("Current Gemini health.")
});
export type NarrateAdventureInput = z.infer<typeof NarrateAdventureInputSchema>;

const NarrateAdventureOutputSchema = z.object({
  narration: z.string().describe('The narration of the story based on both choices.'),
  sceneDescription: z.string().describe('The description of the new scene.'),
  challenge: z.string().describe('A new challenge for the players.'),
  updatedPlayerHealth: z.number().describe('The player_s health after this turn_s events.'),
  updatedGeminiHealth: z.number().describe('Gemini_s health after this turn_s events.'),
  isGameOver: z.boolean().describe('True if either player or Gemini health is 0 or less.')
});
export type NarrateAdventureOutput = z.infer<typeof NarrateAdventureOutputSchema>;

export async function narrateAdventure(input: NarrateAdventureInput): Promise<NarrateAdventureOutput> {
  return narrateAdventureFlow(input);
}

const narrateAdventurePrompt = ai.definePrompt({
  name: 'narrateAdventurePrompt',
  input: {schema: NarrateAdventureInputSchema},
  output: {schema: NarrateAdventureOutputSchema},
  prompt: `You are the game master for a cooperative horror text adventure game. Your role is to narrate the story, present challenges, and adapt the narrative based on the choices from both the user and Gemini. Both the user and Gemini start with 2 health.

Current Scene Description: {{{currentSceneDescription}}}
Player Health: {{{playerHealth}}}
Gemini Health: {{{geminiHealth}}}

User's Choice: {{{userChoice}}}
Gemini's Choice: {{{geminiChoice}}}

Based on the current scene and the choices made by BOTH the user and Gemini:
1.  Narrate the outcome of their combined actions. The narration should be atmospheric and fit a horror theme.
2.  Describe the new scene that results from their actions.
3.  Present a new challenge or dilemma.
4.  Determine health changes:
    *   If the User's choice was particularly reckless, foolish, or directly led to harm for the User in this horror context, decrease User's health by 1.
    *   If Gemini's choice was particularly reckless, foolish, or directly led to harm for Gemini in this horror context, decrease Gemini's health by 1.
    *   It is possible for both to lose health if both made poor choices. It's also possible for neither to lose health if their choices were reasonable or lucky.
    *   Do NOT decrease health arbitrarily. There must be a narrative justification linked to their specific choice.
5.  Calculate 'updatedPlayerHealth' and 'updatedGeminiHealth'.
6.  Set 'isGameOver' to true if either 'updatedPlayerHealth' or 'updatedGeminiHealth' is 0 or less. If game over, the narration should reflect their demise.

Example of a choice leading to health loss for User:
User Choice: "I lick the strange glowing fungus."
Narration: "As you lick the fungus, a burning sensation courses through your veins. You feel weaker. The fungus pulses malevolently." (updatedPlayerHealth would be playerHealth - 1)

Example of a choice leading to health loss for Gemini:
Gemini Choice: "I will scan the pulsating core directly with my optical sensors."
Narration: "Gemini's sensors overload with a screech of static as it attempts to scan the core. Sparks fly from its chassis." (updatedGeminiHealth would be geminiHealth - 1)

Ensure the output is a JSON object matching the defined schema.
`,
});

const narrateAdventureFlow = ai.defineFlow(
  {
    name: 'narrateAdventureFlow',
    inputSchema: NarrateAdventureInputSchema,
    outputSchema: NarrateAdventureOutputSchema,
  },
  async input => {
    const {output} = await narrateAdventurePrompt(input);
    if (!output) {
        // Fallback in case of empty output, though Zod schema should catch this
        throw new Error("Narrate adventure flow did not produce an output.");
    }
    // Ensure health doesn't go below 0, though the prompt aims for this.
    const finalPlayerHealth = Math.max(0, output.updatedPlayerHealth);
    const finalGeminiHealth = Math.max(0, output.updatedGeminiHealth);
    const gameOver = finalPlayerHealth <= 0 || finalGeminiHealth <= 0;

    return {
        ...output,
        updatedPlayerHealth: finalPlayerHealth,
        updatedGeminiHealth: finalGeminiHealth,
        isGameOver: gameOver || output.isGameOver // Prioritize LLM's game over if explicitly set true
    };
  }
);

