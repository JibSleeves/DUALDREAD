// src/ai/flows/narrate-adventure.ts
'use server';
/**
 * @fileOverview Narrates the adventure, adapting to choices, managing health, inventory, and escalating horror.
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
  geminiHealth: z.number().describe("Current Gemini health."),
  turnCount: z.number().describe('The current turn number of the game, starting from 1. Used to scale horror intensity.'),
  currentInventory: z.array(z.string()).describe('A list of items the player currently possesses.')
});
export type NarrateAdventureInput = z.infer<typeof NarrateAdventureInputSchema>;

const NarrateAdventureOutputSchema = z.object({
  narration: z.string().describe('The narration of the story based on both choices.'),
  sceneDescription: z.string().describe('The description of the new scene.'),
  challenge: z.string().describe('A new challenge for the players.'),
  updatedPlayerHealth: z.number().describe('The player_s health after this turn_s events.'),
  updatedGeminiHealth: z.number().describe('Gemini_s health after this turn_s events.'),
  isGameOver: z.boolean().describe('True if either player or Gemini health is 0 or less.'),
  newItemFound: z.string().nullable().describe('The name of a new item found this turn (e.g., "Rusty Key", "Odd Doll"), or null if no item was found.'),
  itemUsed: z.string().nullable().describe('The name of an inventory item that was used or consumed this turn (e.g., "Old Bandage"), or null if no item was used.')
});
export type NarrateAdventureOutput = z.infer<typeof NarrateAdventureOutputSchema>;

export async function narrateAdventure(input: NarrateAdventureInput): Promise<NarrateAdventureOutput> {
  return narrateAdventureFlow(input);
}

const narrateAdventurePrompt = ai.definePrompt({
  name: 'narrateAdventurePrompt',
  input: {schema: NarrateAdventureInputSchema},
  output: {schema: NarrateAdventureOutputSchema},
  prompt: `You are the master storyteller for "Dual Dread," a cooperative horror text adventure. Your role is to weave a terrifying and unpredictable narrative that escalates in intensity, manage game mechanics like health and inventory, and present unique challenges. Both player and Gemini start with 2 health. The game starts at a fixed location (an old wooden fence gate by dark woods) but must become completely randomized and unique after the first turn.

Current Turn: {{{turnCount}}}
Current Scene: {{{currentSceneDescription}}}
Player Health: {{{playerHealth}}}/2
Gemini Health: {{{geminiHealth}}}/2
Player's Inventory: {{#if currentInventory}}{{#each currentInventory}}- {{{this}}} {{/each}}{{else}}Empty{{/if}}

Player's Choice: {{{userChoice}}}
Gemini's Choice: {{{geminiChoice}}}

GAMEPLAY DIRECTIVES:
1.  **Narrate Outcome:** Describe the combined result of the Player's and Gemini's choices.
2.  **New Scene:** Detail the new environment or situation.
3.  **New Challenge:** Present a fresh dilemma, puzzle, or threat.
4.  **Health Changes:**
    *   If a choice was reckless, foolish, or directly led to harm in this horror context, decrease the respective character's health by 1. Justify health loss narratively.
    *   Do NOT decrease health arbitrarily.
5.  **Inventory Management:**
    *   If the narrative leads to discovering an item, set 'newItemFound' to its name (e.g., "Severed Finger", "Corroded Locket", "Whispering Idol"). Make items thematically appropriate to the escalating horror.
    *   If an action uses an item from 'currentInventory', set 'itemUsed' to its name. The game logic will handle removal.
    *   Some challenges may require items. The narrative should imply this.
6.  **Game Over:** Set 'isGameOver' to true if either character's health is <= 0. The narration should reflect their demise.
7.  **Secrets & Easter Eggs:** Occasionally, subtly weave in rare, hidden clues, cryptic messages, or unusual details. These should be well-integrated and hint at deeper lore or unseen horrors.

PROGRESSIVE HORROR ESCALATION (Based on 'turnCount'):
*   **Turns 1-4 (B-Horror Introduction):**
    *   Tone: Atmospheric, classic B-movie horror (eerie sounds, shadows, unsettling quiet). Start tame.
    *   Threats: Indirect, sense of being watched, minor startling events.
    *   Items: Simple, common (e.g., "Flickering Flashlight", "Old Rag").
*   **Turns 5-9 (Rising Tension & Unsettling Discoveries):**
    *   Tone: Increasingly unsettling, psychological elements begin, direct but perhaps ambiguous threats.
    *   Threats: Glimpses of figures, strange occurrences, decaying environments, puzzles that hint at darker things.
    *   Items: More specific, potentially useful or slightly strange (e.g., "Bent Crowbar", "Torn Diary Page").
    *   Secrets: Introduce subtle, cryptic clues or out-of-place objects.
*   **Turns 10-14 (Descent into Disturbing Horror):**
    *   Tone: Genuinely disturbing, psychological horror deepens, reality may feel less stable.
    *   Threats: More complex and terrifying entities (e.g., a "Stitch-Mouthed Effigy" that whispers, a "Shadow That Hunts"). Encounters are more dangerous. Maybe that "killer robot thing" if it fits.
    *   Items: Potentially powerful, cursed, or deeply unsettling (e.g., "Chattering Skull", "Obsidian Knife").
    *   Secrets: More impactful, revealing disturbing truths or attracting unwanted attention.
*   **Turns 15+ (Extreme, Unspeakable & Creative Horror):**
    *   Tone: Push boundaries. Cosmic dread, body horror, surreal nightmarish scenarios, existential threats.
    *   Threats: Grotesque monsters, sanity-bending events, entities beyond comprehension. Make up entirely new, deeply unsettling concepts. The killer robot could be a complex, evolving threat.
    *   Items: Very powerful, dangerous, or bizarre artifacts that might have severe trade-offs.
    *   Secrets: Could lead to alternate minor outcomes or reveal the truly horrifying nature of the situation.

**CRITICAL GOAL: UNIQUE PLAYTHROUGHS. After the initial fixed starting scene, strive to make each game session a distinct horror story. Avoid repetition of specific challenges, monsters, or major plot points from typical game sessions. Be creative and unpredictable.**

Output a JSON object matching the schema. Ensure 'updatedPlayerHealth' and 'updatedGeminiHealth' are calculated.
If game over, the narration MUST be conclusive and describe their fate.
`,
});

const narrateAdventureFlow = ai.defineFlow(
  {
    name: 'narrateAdventureFlow',
    inputSchema: NarrateAdventureInputSchema,
    outputSchema: NarrateAdventureOutputSchema,
  },
  async input => {
    // Ensure turnCount is at least 1 for safety, though page.tsx should handle this.
    const safeInput = {...input, turnCount: Math.max(1, input.turnCount) };
    const {output} = await narrateAdventurePrompt(safeInput);
    if (!output) {
        throw new Error("Narrate adventure flow did not produce an output.");
    }
    
    const finalPlayerHealth = Math.max(0, output.updatedPlayerHealth);
    const finalGeminiHealth = Math.max(0, output.updatedGeminiHealth);
    const gameOver = finalPlayerHealth <= 0 || finalGeminiHealth <= 0;

    return {
        ...output,
        updatedPlayerHealth: finalPlayerHealth,
        updatedGeminiHealth: finalGeminiHealth,
        isGameOver: gameOver || output.isGameOver, // Prioritize LLM's game over if explicitly set true
        newItemFound: output.newItemFound || null,
        itemUsed: output.itemUsed || null,
    };
  }
);
