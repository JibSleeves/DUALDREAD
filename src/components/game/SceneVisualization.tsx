
// src/components/game/SceneVisualization.tsx
"use client";

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ImageOff, AlertTriangleIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SceneVisualizationProps {
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
  sceneDescription?: string;
}

export function SceneVisualization({ imageUrl, isLoading, error, sceneDescription }: SceneVisualizationProps) {
  const getHintFromDescription = (desc?: string) => {
    if (!desc) return "horror scene";
    const commonWords = ["dark", "eerie", "cellar", "forest", "monster", "shadow", "ruins", "abandoned", "creepy", "mysterious", "blood", "operating room", "coffin", "manor", "fog", "ocean", "metallic", "decay"];
    const words = desc.toLowerCase().split(/\s+/);
    const foundKeywords = words.filter(word => commonWords.includes(word.replace(/[.,]/g, '')));
    
    if (foundKeywords.length > 0) {
        return foundKeywords.slice(0, 2).join(" ");
    }
    // Fallback if no specific keywords found, try to pick some generic ones
    const genericKeywords = words.filter(w => w.length > 3).slice(0,2);
    return genericKeywords.length > 0 ? genericKeywords.join(" ") : "horror scene";
  }

  const altText = sceneDescription ? `Visualization of: ${sceneDescription.substring(0, 100)}...` : "Scene visualization";

  return (
    <Card className="bg-card/70 backdrop-blur-sm shadow-lg border-primary/20 mt-6 overflow-hidden group">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="font-horror text-xl text-primary/80">Visual Feed</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="aspect-video w-full relative bg-secondary/20 flex items-center justify-center min-h-[200px]">
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground z-20 bg-card/60 backdrop-blur-sm"
              >
                <Loader2 className="h-12 w-12 animate-spin text-accent mb-3" />
                <p className="text-sm italic">Conjuring visuals...</p>
              </motion.div>
            )}

            {error && !isLoading && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center text-destructive p-4 z-20 bg-card/60 backdrop-blur-sm"
              >
                <AlertTriangleIcon className="h-10 w-10 mb-2" />
                <p className="font-semibold">Visualization Failed</p>
                <p className="text-xs">{error.length > 100 ? `${error.substring(0,100)}...`: error}</p>
              </motion.div>
            )}
            
            <motion.div
              key="background_placeholder"
              initial={{ opacity: 1 }} 
              animate={{ opacity: (isLoading || error || imageUrl) ? 0.3 : 1 }} 
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/50 z-0"
            >
              <ImageOff className="h-16 w-16 mb-2 opacity-30" />
              <p className="text-xs opacity-50">Awaiting visual data...</p>
              <Image
                  src={`https://placehold.co/800x450.png`} 
                  alt="Placeholder visualization"
                  layout="fill"
                  objectFit="cover"
                  data-ai-hint={getHintFromDescription(sceneDescription)}
                  className="opacity-10 pointer-events-none -z-10"
               />
            </motion.div>


            {!isLoading && !error && imageUrl && (
              <motion.div
                key={imageUrl} 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
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
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
