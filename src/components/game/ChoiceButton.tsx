"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

interface ChoiceButtonProps {
  choiceText: string;
  onClick: () => void;
  disabled: boolean;
  Icon?: LucideIcon;
}

export function ChoiceButton({ choiceText, onClick, disabled, Icon }: ChoiceButtonProps) {
  return (
    <Button
      variant="outline"
      className="w-full justify-start text-left h-auto py-3 px-4 border-accent/50 hover:bg-accent/20 hover:text-accent-foreground focus:bg-accent/30 focus:ring-accent text-base"
      onClick={onClick}
      disabled={disabled}
    >
      {Icon && <Icon className="mr-3 h-5 w-5 text-accent shrink-0" />}
      <span className="flex-1 whitespace-normal break-words">{choiceText}</span>
    </Button>
  );
}
