
// src/components/game/SceneVisualization.tsx
"use client";

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ImageOff, AlertTriangleIcon, ThermometerSnow, Ghost } from 'lucide-react'; // Added more icons
import { motion, AnimatePresence } from 'framer-motion';

interface SceneVisualizationProps {
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
  sceneDescription?: string;
}

export function SceneVisualization({ imageUrl, isLoading, error, sceneDescription }: SceneVisualizationProps) {
  const getHintFromDescription = (desc?: string): string => {
    if (!desc) return "dark eerie"; // Default hint

    const lowerDesc = desc.toLowerCase();
    // More specific keywords
    const horrorKeywords = [
        "monster", "ghost", "spirit", "demon", "crypt", "coffin", "grave", "haunted", "possessed",
        "blood", "gore", "nightmare", "terror", "fear", "shadow", "darkness", "eerie", "creepy",
        "abandoned", "ruins", "asylum", "hospital", "woods", "forest", "swamp", "cave", "cellar",
        "ritual", "sacrifice", "occult", "supernatural", "undead", "zombie", "vampire", "werewolf",
        "trapped", "escape", "danger", "threat", "manor", "castle", "fog", "mist", "storm",
        "doll", "puppet", "clown", "labyrinth", "maze", "whisper", "scream", "silence", "unholy",
        "decay", "rot", "flesh", "bones", "skull", "corpse", "apparition", "poltergeist", "eldritch",
        "cosmic horror", "body horror", "psychological", "unseen", "unknown", "ancient evil", "cursed",
        "robot", "metallic", "cyborg", "glitch", "static"
    ];

    // Prioritize horror keywords
    const foundHorrorKeywords = horrorKeywords.filter(kw => lowerDesc.includes(kw));
    if (foundHorrorKeywords.length > 0) {
        // Pick up to two most relevant (often first occurring)
        const sortedHorrorKeywords = foundHorrorKeywords.sort((a, b) => lowerDesc.indexOf(a) - lowerDesc.indexOf(b));
        return sortedHorrorKeywords.slice(0, 2).join(" ");
    }

    // Fallback: general words if no horror keywords
    const words = lowerDesc.replace(/[^\w\s]/gi, '').split(/\s+/); // Remove punctuation
    const significantWords = words.filter(word => word.length > 3 && !["this", "that", "with", "from", "into", "they", "your"].includes(word));

    if (significantWords.length > 0) {
        return significantWords.slice(0, 2).join(" ");
    }

    return "dark eerie"; // Final fallback
  };


  const altText = sceneDescription ? `Visualization of: ${sceneDescription.substring(0, 100)}...` : "Scene visualization";
  const placeholderHint = getHintFromDescription(sceneDescription);

  const placeholderIcons = [ImageOff, ThermometerSnow, Ghost];
  const PlaceholderIcon = placeholderIcons[Math.floor(Math.random() * placeholderIcons.length)];


  return (
    <Card className="bg-card/70 backdrop-blur-sm shadow-lg border-primary/20 mt-6 overflow-hidden group">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="font-horror text-xl text-primary/80">Visual Feed</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="aspect-video w-full relative bg-secondary/30 flex items-center justify-center min-h-[200px]">
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground z-20 bg-card/70 backdrop-blur-sm"
              >
                <Loader2 className="h-12 w-12 animate-spin text-accent mb-3" />
                <p className="text-sm italic">The veil thins, conjuring visuals...</p>
              </motion.div>
            )}

            {error && !isLoading && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center text-destructive p-4 z-20 bg-card/70 backdrop-blur-sm"
              >
                <AlertTriangleIcon className="h-10 w-10 mb-2" />
                <p className="font-semibold">VISUAL DISTORTION DETECTED</p>
                <p className="text-xs">{error.length > 100 ? `${error.substring(0,100)}...`: error}</p>
              </motion.div>
            )}

            {/* Background Placeholder Image - always present but opacity changes */}
            <motion.div
              key="background_placeholder_image"
              initial={{ opacity: 0.1 }} // Start a bit visible
              animate={{ opacity: (isLoading || error || imageUrl) ? 0.05 : 0.15 }} // More visible if nothing else is shown
              transition={{ duration: 0.5 }}
              className="absolute inset-0 z-0"
            >
              <Image
                  src={`https://placehold.co/800x450.png`}
                  alt="Placeholder visualization background"
                  layout="fill"
                  objectFit="cover"
                  data-ai-hint={placeholderHint}
                  className="pointer-events-none opacity-100" // Full opacity for the image itself
               />
            </motion.div>

            {/* Icon and text placeholder - shown when no image, no loading, no error */}
            {!isLoading && !error && !imageUrl && (
                 <motion.div
                    key="icon_placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/60 z-10"
                  >
                    <PlaceholderIcon className="h-16 w-16 mb-2 opacity-50" />
                    <p className="text-xs opacity-70">Awaiting visual data from the void...</p>
                 </motion.div>
            )}


            {!isLoading && !error && imageUrl && (
              <motion.div
                key={imageUrl}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }} // Slight scale down on exit
                transition={{ duration: 0.8, ease: "anticipate" }}
                className="w-full h-full z-10"
              >
                <Image
                  src={imageUrl}
                  alt={altText}
                  layout="fill"
                  objectFit="cover"
                  className="transition-transform duration-700 ease-in-out group-hover:scale-105"
                  priority={true}
                  unoptimized={imageUrl.startsWith('data:image')} // Next.js image optimization might not work well with very large base64 data URIs
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}

    