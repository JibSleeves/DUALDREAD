// src/ai/flows/interpret-choices.ts
'use server';

/**
 * @fileOverview This file contains the Genkit flow for Gemini to make its choice in the Dual Dread text adventure game.
 *
 * It uses Gemini to evaluate the situation, available choices, its health, and stamina to make a sensible decision.
 *
 * - interpretChoices - A function that handles Gemini's choice-making process.
 * - InterpretChoicesInput - The input type for the interpretChoices function.
 * - InterpretChoicesOutput - The return type for the interpretChoices function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MAX_STAMINA = 3; // Consistent with narrateAdventure

const InterpretChoicesInputSchema = z.object({
  sceneDescription: z.string().describe('The description of the current scene.'),
  availableChoices: z.array(z.string()).describe('The choices available for Gemini to pick from.'),
  currentGeminiHealth: z.number().describe("Gemini's current health points (e.g., 2 out of 2)."),
  currentGeminiStamina: z.number().describe(`Gemini's current stamina points (e.g., ${MAX_STAMINA} out of ${MAX_STAMINA}).`)
});
export type InterpretChoicesInput = z.infer<typeof InterpretChoicesInputSchema>;

const InterpretChoicesOutputSchema = z.object({
  chosenOption: z.string().describe('The option chosen by Gemini from the availableChoices list.'),
  reasoning: z.string().describe('The reasoning behind Gemini_s choice, considering the scene, its health, stamina, and the horror context.'),
});
export type InterpretChoicesOutput = z.infer<typeof InterpretChoicesOutputSchema>;

export async function interpretChoices(input: InterpretChoicesInput): Promise<InterpretChoicesOutput> {
  return interpretChoicesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interpretChoicesPrompt',
  input: {schema: InterpretChoicesInputSchema},
  output: {schema: InterpretChoicesOutputSchema},
  prompt: `You are an AI companion in a cooperative horror text-based adventure game. The game master has provided a description of the current scene and a list of possible actions (choices). Your human partner has already made their choice for this turn.

Your task is to choose ONE option from the 'availableChoices' list that you think is the most sensible or strategically sound for YOU to take in this horror scenario. Explain your reasoning.

Your Current Health: {{{currentGeminiHealth}}}/2.
Your Current Stamina: {{{currentGeminiStamina}}}/${MAX_STAMINA}. Low stamina (0-1) means you should avoid physically demanding actions unless absolutely necessary. High stamina (2-${MAX_STAMINA}) allows for more vigorous options.

Current Scene:
{{{sceneDescription}}}

Here are the actions YOU can take:
{{#each availableChoices}}
- {{{this}}}
{{/each}}

Consider the situation, your health, your stamina, and the goal of survival. You don't always have to be cautious, sometimes a risk is necessary, but be intelligent. If an action seems physically demanding (running, fighting, prying), factor in your stamina.

You MUST choose only one of the options from the 'availableChoices' list.
You MUST set the 'reasoning' to be a concise explanation of your choice.

Output a JSON object with keys:
- chosenOption: The choice you selected from the list.
- reasoning: Your reasoning for choosing that option.
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
    if (!output) {
      // Fallback if LLM fails to produce an output.
      const randomChoice = input.availableChoices[Math.floor(Math.random() * input.availableChoices.length)] || "Stay put and observe.";
      return {
        chosenOption: randomChoice,
        reasoning: "System fallback: A random choice was made due to an unexpected error in decision processing."
      };
    }
    // Ensure the chosen option is one of the available options
    if (!input.availableChoices.includes(output.chosenOption)) {
        console.warn(`LLM chose an invalid option: '${output.chosenOption}'. Available: ${input.availableChoices.join(', ')}. Picking first available.`);
        return {
            chosenOption: input.availableChoices[0] || "Observe the surroundings.", 
            reasoning: output.reasoning + " (System corrected to a valid choice from the list as original was not available.)"
        };
    }
    return output;
  }
);

