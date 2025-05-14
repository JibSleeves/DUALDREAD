"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion'; // Import framer-motion

interface SceneDisplayProps {
  narration: string;
  sceneDescription: string;
  challenge: string;
}

const TypewriterText: React.FC<{ text: string; delay?: number; className?: string }> = ({ text, delay = 0, className = "" }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayedText("");
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (!text) return;

    const initialDelay = setTimeout(() => {
      if (currentIndex < text.length) {
        const timeoutId = setTimeout(() => {
          setDisplayedText((prev) => prev + text[currentIndex]);
          setCurrentIndex((prev) => prev + 1);
        }, 20); // Adjust typing speed (ms per character)
        return () => clearTimeout(timeoutId);
      }
    }, delay);
    
    return () => clearTimeout(initialDelay);
  }, [currentIndex, text, delay]);

  // Blinking cursor effect
  const cursorVisible = currentIndex < text.length;

  return (
    <span className={className}>
      {displayedText}
      {cursorVisible && <span className="inline-block w-2 h-5 bg-accent animate-pulse ml-1"></span>}
    </span>
  );
};


export function SceneDisplay({ narration, sceneDescription, challenge }: SceneDisplayProps) {
  const [key, setKey] = useState(0); // Key to force re-render for typewriter effect

  useEffect(() => {
    setKey(prevKey => prevKey + 1);
  }, [narration, sceneDescription, challenge]);

  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl border-primary/30">
      <CardHeader>
        <CardTitle className="font-horror text-3xl text-primary tracking-wider">
          Current Situation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-lg">
        {narration && (
          <motion.div
            key={`narration-${key}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <CardDescription className="text-foreground/90 italic leading-relaxed">
              <TypewriterText text={narration} />
            </CardDescription>
          </motion.div>
        )}
        {sceneDescription && (
          <motion.div
            key={`scene-${key}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: narration ? (narration.length * 0.02) : 0 }} // Delay based on narration length
          >
            <p className="text-foreground leading-relaxed">
              <TypewriterText text={sceneDescription} delay={narration ? (narration.length * 20 + 500) : 0} />
            </p>
          </motion.div>
        )}
        {challenge && (
          <motion.div
            key={`challenge-${key}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: (narration.length * 0.02) + (sceneDescription.length * 0.02) }}
          >
            <p className="text-accent font-semibold mt-4 leading-relaxed">
              <TypewriterText text={`Challenge: ${challenge}`} delay={(narration.length * 20) + (sceneDescription.length * 20) + 1000} />
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
