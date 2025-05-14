
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface StartMenuProps {
  onStartGame: () => void;
  onOpenSettings: () => void;
}

export function StartMenu({ onStartGame, onOpenSettings }: StartMenuProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-background to-secondary/50 relative text-center">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mb-12"
      >
        <h1 className="font-horror text-6xl sm:text-7xl md:text-8xl text-primary animate-pulse">
          Dual Dread
        </h1>
        <p className="text-xl text-muted-foreground italic mt-2">
          No one hears your screams in the digital void.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
        className="space-y-6 flex flex-col items-center w-full max-w-xs"
      >
        <Button
          onClick={onStartGame}
          variant="default"
          size="lg"
          className="w-full font-horror text-2xl py-8 rounded-lg shadow-xl hover:shadow-primary/50 transition-shadow duration-300 group"
          aria-label="Start Game"
        >
          <PlayCircle className="mr-3 h-8 w-8 transition-transform duration-300 group-hover:scale-110" />
          Begin Your Descent
        </Button>
        <Button
          onClick={onOpenSettings}
          variant="outline"
          size="lg"
          className="w-full font-horror text-xl py-6 rounded-lg border-accent/70 hover:bg-accent/10 hover:text-accent-foreground transition-colors duration-300 group"
          aria-label="Open Settings"
        >
          <Settings className="mr-3 h-6 w-6 transition-transform duration-300 group-hover:rotate-45" />
          Configure Horrors
        </Button>
      </motion.div>
       <footer className="absolute bottom-8 w-full max-w-3xl text-center">
        <p className="text-sm text-muted-foreground/70">
          Dual Dread &copy; {new Date().getFullYear()}. Prepare for the unknown.
        </p>
      </footer>
    </div>
  );
}
