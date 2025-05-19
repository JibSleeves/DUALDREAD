
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface SceneDisplayProps {
  narration: string;
  sceneDescription: string;
  challenge: string;
}

const TypewriterText: React.FC<{ text: string; delay?: number; className?: string }> = ({ text, delay = 0, className = "" }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Reset when text prop changes
    setDisplayedText("");
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (!text) return;

    // Initial delay before typing starts
    const startTypingTimeout = setTimeout(() => {
      if (currentIndex < text.length) {
        const charTimeout = setTimeout(() => {
          setDisplayedText((prev) => prev + text[currentIndex]);
          setCurrentIndex((prev) => prev + 1);
        }, 20); // Typing speed (ms per character)
        return () => clearTimeout(charTimeout);
      }
    }, delay); // Delay before this segment starts typing

    return () => clearTimeout(startTypingTimeout);
  }, [currentIndex, text, delay]);

  const cursorVisible = currentIndex < text.length && currentIndex > 0; // Show cursor only while typing and after first char

  return (
    <span className={className}>
      {displayedText}
      {cursorVisible && <span className="inline-block w-0.5 h-5 bg-accent animate-pulse ml-1 align-text-bottom"></span>}
      {!cursorVisible && displayedText.length === text.length && <span className="inline-block w-0.5 h-5 bg-transparent ml-1 align-text-bottom"></span>} {/* Keeps space when done */}
    </span>
  );
};


export function SceneDisplay({ narration, sceneDescription, challenge }: SceneDisplayProps) {
  // Using a unique key for each text segment to ensure typewriter resets correctly
  const narrationKey = `narration-${narration.substring(0,10)}-${narration.length}`;
  const sceneKey = `scene-${sceneDescription.substring(0,10)}-${sceneDescription.length}`;
  const challengeKey = `challenge-${challenge.substring(0,10)}-${challenge.length}`;

  const narrationDuration = narration.length * 20 + 500; // Estimated typing time + buffer
  const sceneDescriptionDuration = sceneDescription.length * 20 + 500;

  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl border-primary/30">
      <CardHeader>
        <CardTitle className="font-horror text-3xl text-primary tracking-wider">
          Current Situation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-lg leading-relaxed">
        {narration && (
          <motion.div
            key={narrationKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <CardDescription className="text-foreground/90 italic">
              <TypewriterText text={narration} />
            </CardDescription>
          </motion.div>
        )}
        {sceneDescription && (
          <motion.div
            key={sceneKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: narration ? (narration.length * 0.025) : 0 }}
          >
            <p className="text-foreground">
              <TypewriterText text={sceneDescription} delay={narration ? narrationDuration : 0} />
            </p>
          </motion.div>
        )}
        {challenge && (
          <motion.div
            key={challengeKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: (narration ? narrationDuration / 1000 : 0) + (sceneDescription ? sceneDescriptionDuration / 1000 : 0) * 0.2 }}
          >
            <p className="text-accent font-semibold mt-4">
              <TypewriterText text={`Challenge: ${challenge}`} delay={(narration ? narrationDuration : 0) + (sceneDescription ? sceneDescriptionDuration: 0)} />
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

    