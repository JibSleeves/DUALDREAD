
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Bot, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GeminiStatusProps {
  geminiChoice?: string | null;
  geminiReasoning?: string | null;
  geminiHint?: string | null;
  loading: boolean;
}

export function GeminiStatus({ geminiChoice, geminiReasoning, geminiHint, loading }: GeminiStatusProps) {
  if (loading && !geminiChoice && !geminiReasoning && !geminiHint) {
    return (
      <Card className="bg-card/70 backdrop-blur-sm shadow-md border-secondary/30 mt-6">
        <CardContent className="p-6 flex items-center justify-center text-secondary-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-accent" />
          <span className="italic">Gemini is pondering its next move...</span>
        </CardContent>
      </Card>
    );
  }

  if (!geminiChoice && !geminiReasoning && !geminiHint) {
    return null; // Nothing to display if not loading and no info
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
            {geminiHint && (
              <Alert variant="default" className="bg-accent/10 border-accent/50 text-accent-foreground mt-3">
                <Lightbulb className="h-5 w-5 text-accent" />
                <AlertTitle className="font-horror text-accent">A Glimmer of Insight</AlertTitle>
                <AlertDescription>
                  {geminiHint}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
