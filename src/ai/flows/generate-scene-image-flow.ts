// src/ai/flows/generate-scene-image-flow.ts
'use server';
/**
 * @fileOverview Generates an image visualization for a game scene.
 *
 * - generateSceneImage - A function that generates an image based on scene description.
 * - GenerateSceneImageInput - The input type.
 * - GenerateSceneImageOutput - The output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSceneImageInputSchema = z.object({
  sceneDescription: z.string().describe('A detailed description of the game scene to visualize.'),
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
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', // IMPORTANT: Use the specified model for image generation
      prompt: `Generate a detailed, atmospheric, and slightly unsettling visualization for a horror text adventure game. The scene is: "${input.sceneDescription}". The image should be dark, evocative, and capture a sense of dread or mystery. Focus on key elements mentioned in the description. Ensure the aspect ratio is 16:9. Do not include any text overlays on the image itself.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE
      },
    });

    if (!media || !media.url) {
      throw new Error('Image generation failed or returned no media URL.');
    }

    return { imageDataUri: media.url };
  }
);
