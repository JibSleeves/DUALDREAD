// src/ai/flows/narrate-adventure.ts
'use server';
/**
 * @fileOverview Narrates the adventure, adapting to choices, managing health, inventory, stamina, and escalating horror.
 *
 * - narrateAdventure - A function that handles the dynamic narration of the game.
 * - NarrateAdventureInput - The input type for the narrateAdventure function.
 * - NarrateAdventureOutput - The return type for the narrateAdventure function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MAX_STAMINA = 3; // Define max stamina here to be used in prompt and logic

const NarrateAdventureInputSchema = z.object({
  userChoice: z.string().describe('The player choice.'),
  geminiChoice: z.string().describe("Gemini's choice."),
  currentSceneDescription: z.string().describe('The current scene description.'),
  playerHealth: z.number().describe("Current player health."),
  geminiHealth: z.number().describe("Current Gemini health."),
  playerStamina: z.number().describe("Current player stamina."),
  geminiStamina: z.number().describe("Current Gemini stamina."),
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
  updatedPlayerStamina: z.number().describe('The player_s stamina after this turn_s events.'),
  updatedGeminiStamina: z.number().describe('Gemini_s stamina after this turn_s events.'),
  isGameOver: z.boolean().describe('True if either player or Gemini health is 0 or less.'),
  newItemFound: z.string().nullable().describe('The name of a new item found this turn (e.g., "Rusty Key", "Odd Doll"), or null if no item was found.'),
  itemUsed: z.string().nullable().describe('The name of an inventory item that was used or consumed this turn (e.g., "Old Bandage"), or null if no item was used.'),
  playerLostHealthThisTurn: z.boolean().optional().describe('True if the player lost health this turn due to a choice or lack of stamina.'),
  geminiLostHealthThisTurn: z.boolean().optional().describe('True if Gemini lost health this turn due to a choice or lack of stamina.'),
});
export type NarrateAdventureOutput = z.infer<typeof NarrateAdventureOutputSchema>;

export async function narrateAdventure(input: NarrateAdventureInput): Promise<NarrateAdventureOutput> {
  return narrateAdventureFlow(input);
}

const narrateAdventurePrompt = ai.definePrompt({
  name: 'narrateAdventurePrompt',
  input: {schema: NarrateAdventureInputSchema},
  output: {schema: NarrateAdventureOutputSchema},
  prompt: `You are the master storyteller for "Dual Dread," a cooperative horror text adventure. Your role is to weave a terrifying and unpredictable narrative, manage game mechanics (health, stamina, inventory), and present unique challenges. Max health is 2 for both. Max stamina is ${MAX_STAMINA} for both. The game starts at an old wooden fence gate by dark woods but must become completely randomized after the first turn.

Current Turn: {{{turnCount}}}
Current Scene: {{{currentSceneDescription}}}
Player Health: {{{playerHealth}}}/2, Player Stamina: {{{playerStamina}}}/${MAX_STAMINA}
Gemini Health: {{{geminiHealth}}}/2, Gemini Stamina: {{{geminiStamina}}}/${MAX_STAMINA}
Player's Inventory: {{#if currentInventory}}{{#each currentInventory}}- {{{this}}} {{/each}}{{else}}Empty{{/if}}

Player's Choice: {{{userChoice}}}
Gemini's Choice: {{{geminiChoice}}}

GAMEPLAY DIRECTIVES:
1.  **Narrate Outcome:** Describe the combined result of Player's and Gemini's choices.
2.  **New Scene:** Detail the new environment or situation.
3.  **New Challenge:** Present a fresh dilemma, puzzle, or threat.
4.  **Health & Stamina Management:**
    *   **Stamina Cost:** For each character's choice, determine if it's physically strenuous (running, fighting, struggling, prying, heavy lifting, intense searching, using items that require exertion).
        *   If strenuous AND character's stamina > 0: Decrement their stamina by 1. Action proceeds, note their exertion.
        *   If strenuous AND character's stamina == 0:
            *   If action was CRITICAL for immediate survival (e.g., dodging attack, fleeing direct danger, fighting aggressor): Character fails due to exhaustion, decrement their health by 1. Narrate failure and resulting harm.
            *   If action was strenuous but NOT immediately critical if failed (e.g., prying open stuck chest when not under direct threat): Action fails due to exhaustion. Narrate this. DO NOT decrease health for this type of stamina failure.
    *   **Health Loss from Choices:** If a choice (independent of stamina) was reckless, foolish, or directly led to harm in this horror context, decrease the respective character's health by 1. Justify narratively.
    *   **Stamina Recovery:** If a character did NOT perform a stamina-consuming action this turn, they recover 1 stamina, up to ${MAX_STAMINA}.
    *   Set 'playerLostHealthThisTurn' to true if player health decreased, false otherwise.
    *   Set 'geminiLostHealthThisTurn' to true if Gemini health decreased, false otherwise.
5.  **Inventory Management:**
    *   If narrative leads to discovering an item, set 'newItemFound' (e.g., "Severed Finger," "Corroded Locket"). Make items thematic.
    *   If an action uses an inventory item, set 'itemUsed'. Game logic handles removal.
6.  **Game Over:** Set 'isGameOver' to true if either health is <= 0. Narration reflects their demise.
7.  **Secrets & Easter Eggs:** Occasionally, subtly weave in rare, hidden clues, cryptic messages, or unusual details.

PROGRESSIVE HORROR ESCALATION (Based on 'turnCount'):
*   **Turns 1-4 (B-Horror Intro):** Atmospheric, B-movie horror. Threats indirect. Items simple. Visuals: shadows, fog.
*   **Turns 5-9 (Rising Tension):** More unsettling, psychological. Direct but ambiguous threats. Items specific/strange. Visuals: unsettling details, decay. Secrets: subtle clues.
*   **Turns 10-14 (Disturbing Horror):** Genuinely disturbing. Complex/terrifying entities (e.g., "Stitch-Mouthed Effigy," "Shadow That Hunts," maybe "killer robot thing" if it fits). Items powerful/cursed. Visuals: active threat, psychological distress. Secrets: impactful, disturbing truths.
*   **Turns 15+ (Extreme & Creative Horror):** Push boundaries. Cosmic dread, body horror, surreal nightmares, existential threats. Grotesque monsters, sanity-bending events, "killer robot" as evolving threat. Items very powerful/dangerous. Visuals: terrifying, grotesque, surreal. Secrets: alternate outcomes, horrifying nature of reality.

**CRITICAL GOAL: UNIQUE PLAYTHROUGHS. After the fixed start, make each game distinct. Avoid repetition. Be creative and unpredictable.**

Output JSON. Ensure ALL health and stamina fields are updated. If game over, narration MUST be conclusive.
If playerLostHealthThisTurn or geminiLostHealthThisTurn is true, ensure narration reflects the cause of health loss clearly.
`,
});

const narrateAdventureFlow = ai.defineFlow(
  {
    name: 'narrateAdventureFlow',
    inputSchema: NarrateAdventureInputSchema,
    outputSchema: NarrateAdventureOutputSchema,
  },
  async input => {
    const safeInput = {
      ...input,
      turnCount: Math.max(1, input.turnCount),
      playerStamina: Math.max(0, Math.min(input.playerStamina, MAX_STAMINA)),
      geminiStamina: Math.max(0, Math.min(input.geminiStamina, MAX_STAMINA)),
    };

    const {output} = await narrateAdventurePrompt(safeInput);
    if (!output) {
        throw new Error("Narrate adventure flow did not produce an output.");
    }
    
    const finalPlayerHealth = Math.max(0, output.updatedPlayerHealth);
    const finalGeminiHealth = Math.max(0, output.updatedGeminiHealth);
    const finalPlayerStamina = Math.max(0, Math.min(output.updatedPlayerStamina, MAX_STAMINA));
    const finalGeminiStamina = Math.max(0, Math.min(output.updatedGeminiStamina, MAX_STAMINA));
    const gameOver = finalPlayerHealth <= 0 || finalGeminiHealth <= 0;

    return {
        ...output,
        updatedPlayerHealth: finalPlayerHealth,
        updatedGeminiHealth: finalGeminiHealth,
        updatedPlayerStamina: finalPlayerStamina,
        updatedGeminiStamina: finalGeminiStamina,
        isGameOver: gameOver || output.isGameOver, // Prioritize LLM's game over if explicitly set true
        newItemFound: output.newItemFound || null,
        itemUsed: output.itemUsed || null,
        playerLostHealthThisTurn: output.updatedPlayerHealth < input.playerHealth,
        geminiLostHealthThisTurn: output.updatedGeminiHealth < input.geminiHealth,
    };
  }
);

