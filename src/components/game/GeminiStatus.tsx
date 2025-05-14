
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GeminiStatusProps {
  geminiChoice?: string | null;
  geminiReasoning?: string | null;
  loading: boolean; // True if Gemini is processing its choice
  isGeminiTurn?: boolean; // Specifically for Gemini's turn loading message
}

export function GeminiStatus({ geminiChoice, geminiReasoning, loading, isGeminiTurn }: GeminiStatusProps) {
  if (loading && isGeminiTurn) {
    return (
      <Card className="bg-card/70 backdrop-blur-sm shadow-md border-secondary/30 mt-6">
        <CardContent className="p-6 flex items-center justify-center text-secondary-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-accent" />
          <span className="italic">Gemini is pondering its next move...</span>
        </CardContent>
      </Card>
    );
  }
  
  // This condition handles loading for narration AFTER Gemini has made its choice
  if (loading && !isGeminiTurn && !geminiChoice && !geminiReasoning) {
     return (
      <Card className="bg-card/70 backdrop-blur-sm shadow-md border-secondary/30 mt-6">
        <CardContent className="p-6 flex items-center justify-center text-secondary-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-accent" />
          <span className="italic">The story unfolds...</span>
        </CardContent>
      </Card>
    );
  }


  if (!geminiChoice && !geminiReasoning && !loading) {
    return null; // Nothing to display if not loading and no info
  }
  
  // Only show Gemini's choice and reasoning if they exist
  if (!geminiChoice && !geminiReasoning) {
    return null;
  }


  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-card/70 backdrop-blur-sm shadow-md border-secondary/30 mt-6">
          <CardHeader>
            <CardTitle className="font-horror text-xl text-secondary-foreground flex items-center">
              <Bot className="mr-2 h-6 w-6 text-accent" />
              Gemini's Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {geminiChoice && (
              <p>
                <strong className="text-accent">Choice:</strong> {geminiChoice}
              </p>
            )}
            {geminiReasoning && (
              <p className="text-sm text-muted-foreground italic">
                <strong className="text-accent not-italic">Reasoning:</strong> "{geminiReasoning}"
              </p>
            )}
            {/* Removed hint display as it's no longer part of Gemini's direct output */}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
