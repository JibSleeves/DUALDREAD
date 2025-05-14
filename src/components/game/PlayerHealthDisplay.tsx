
"use client";

import React from 'react';
import { Heart, Bot } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PlayerHealthDisplayProps {
  playerName: string;
  playerHealth: number;
  geminiName: string;
  geminiHealth: number;
  maxHealth: number;
}

const HeartIconDisplay: React.FC<{ currentHealth: number; maxHealth: number }> = ({ currentHealth, maxHealth }) => {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxHealth }).map((_, i) => (
        <Heart
          key={i}
          className={cn(
            "h-5 w-5 sm:h-6 sm:w-6 transition-all duration-300",
            i < currentHealth ? "text-red-500 fill-red-500 animate-pulse" : "text-muted-foreground/50 fill-muted-foreground/20"
          )}
          style={{ animationDuration: i < currentHealth ? '1.5s' : '0s' }}
        />
      ))}
    </div>
  );
};

export function PlayerHealthDisplay({ 
  playerName, 
  playerHealth, 
  geminiName, 
  geminiHealth, 
  maxHealth 
}: PlayerHealthDisplayProps) {
  return (
    <Card className="bg-card/70 backdrop-blur-sm shadow-md border-secondary/30">
      <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row justify-around items-center gap-3 sm:gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <h3 className="text-sm sm:text-base font-semibold text-primary-foreground">{playerName}</h3>
          <HeartIconDisplay currentHealth={playerHealth} maxHealth={maxHealth} />
          <p className="text-xs text-muted-foreground">({playerHealth}/{maxHealth})</p>
        </div>
        <div className="w-full sm:w-px h-px sm:h-12 bg-border my-2 sm:my-0"></div> {/* Separator */}
        <div className="flex flex-col items-center gap-1 text-center">
          <h3 className="text-sm sm:text-base font-semibold text-accent flex items-center">
            <Bot className="mr-1.5 h-4 w-4 sm:h-5 sm:w-5" /> {geminiName}
          </h3>
          <HeartIconDisplay currentHealth={geminiHealth} maxHealth={maxHealth} />
          <p className="text-xs text-muted-foreground">({geminiHealth}/{maxHealth})</p>
        </div>
      </CardContent>
    </Card>
  );
}
