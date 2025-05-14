// src/ai/flows/generate-scene-image-flow.ts
'use server';
/**
 * @fileOverview Generates an image visualization for a game scene, escalating in horror with turn count.
 *
 * - generateSceneImage - A function that generates an image based on scene description and turn count.
 * - GenerateSceneImageInput - The input type.
 * - GenerateSceneImageOutput - The output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSceneImageInputSchema = z.object({
  sceneDescription: z.string().describe('A detailed description of the game scene to visualize.'),
  turnCount: z.number().describe('The current turn number, to influence the visual style_s intensity and horror level.'),
});
export type GenerateSceneImageInput = z.infer<typeof GenerateSceneImageInputSchema>;

const GenerateSceneImageOutputSchema = z.object({
  imageDataUri: z.string().describe(
    "The generated image as a data URI. Format: 'data:image/png;base64,<encoded_data>'."
  ),
});
export type GenerateSceneImageOutput = z.infer<typeof GenerateSceneImageOutputSchema>;

export async function generateSceneImage(input: GenerateSceneImageInput): Promise<GenerateSceneImageOutput> {
  return generateSceneImageFlow(input);
}

const generateSceneImageFlow = ai.defineFlow(
  {
    name: 'generateSceneImageFlow',
    inputSchema: GenerateSceneImageInputSchema,
    outputSchema: GenerateSceneImageOutputSchema,
  },
  async (input) => {
    let imagePromptSegment = "";

    if (input.turnCount <= 4) {
      imagePromptSegment = "The image should be atmospheric, dark, and evocative of B-movie horror – think shadows, fog, old buildings, a sense of unease. Avoid explicit gore or monsters. Capture the essence of classic, subtle horror.";
    } else if (input.turnCount <= 9) {
      imagePromptSegment = "The image should be more unsettling. Hint at threats, perhaps with silhouettes, strange glows, or a more claustrophobic or decaying environment. Minor unsettling details like glowing eyes in the dark, strange symbols, or a sense of being watched are appropriate. The mood should be one of rising tension.";
    } else if (input.turnCount <= 14) {
      imagePromptSegment = "The image should be genuinely disturbing. Visuals can include more explicit unsettling elements, glimpses of strange entities (e.g., twisted figures, unnatural anatomy), scenes of psychological distress, or environments that feel actively hostile or corrupted. The mood should be one of dread and active threat.";
    } else { // turnCount >= 15
      imagePromptSegment = "The image should be terrifying and potentially grotesque or surreal. Depict monstrous forms, nightmarish landscapes, elements of body horror, or abstract representations of madness and fear. Be bold and creative in visualizing extreme horror concepts like cosmic entities, bizarre technological horrors, or visceral unsettling scenes.";
    }

    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', 
      prompt: `Generate a detailed, 16:9 aspect ratio visualization for a horror text adventure game.
      Scene Description: "${input.sceneDescription}"
      Current Turn Count: ${input.turnCount}.
      Visual Style Guidance: ${imagePromptSegment}
      Focus on key elements mentioned in the description. Ensure the aspect ratio is 16:9. Do not include any text overlays on the image itself. Make it dark and evocative.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media || !media.url) {
      throw new Error('Image generation failed or returned no media URL.');
    }

    return { imageDataUri: media.url };
  }
);
