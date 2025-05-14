"use client";

import React from 'react';
import { ChoiceButton } from './ChoiceButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skull, Eye, MessageSquare, Zap, ChevronRightIcon, type LucideIcon, Ghost, Sprout, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface PlayerInputAreaProps {
  choices: string[];
  onChoiceSelect: (choice: string) => void;
  disabled: boolean;
}

const icons: LucideIcon[] = [Eye, HelpCircle, Sprout, Ghost, Skull, Zap, MessageSquare, ChevronRightIcon];

export function PlayerInputArea({ choices, onChoiceSelect, disabled }: PlayerInputAreaProps) {
  if (!choices.length) {
    return null;
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-lg border-primary/30 mt-6">
      <CardHeader>
        <CardTitle className="font-horror text-2xl text-primary">Your Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {choices.map((choice, index) => {
          const IconToShow = icons[index % icons.length];
          return (
            <motion.div
              key={choice}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <ChoiceButton
                choiceText={choice}
                onClick={() => onChoiceSelect(choice)}
                disabled={disabled}
                Icon={IconToShow}
              />
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
