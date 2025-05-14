
"use client";

import React from 'react';
import { Heart, Bot, Zap, Activity } from 'lucide-react'; // Added Zap for stamina
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PlayerHealthDisplayProps {
  playerName: string;
  playerHealth: number;
  playerStamina: number;
  geminiName: string;
  geminiHealth: number;
  geminiStamina: number;
  maxHealth: number;
  maxStamina: number;
}

const StatIconDisplay: React.FC<{ 
  currentValue: number; 
  maxValue: number; 
  IconComponent: React.ElementType;
  iconColorClass: string;
  fillColorClass: string;
  pulse?: boolean;
}> = ({ currentValue, maxValue, IconComponent, iconColorClass, fillColorClass, pulse }) => {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxValue }).map((_, i) => (
        <IconComponent
          key={i}
          className={cn(
            "h-5 w-5 sm:h-6 sm:w-6 transition-all duration-300",
            i < currentValue ? `${iconColorClass} ${fillColorClass}` : "text-muted-foreground/50 fill-muted-foreground/20",
            pulse && i < currentValue && "animate-pulse"
          )}
          style={{ animationDuration: pulse && i < currentValue ? '1.5s' : '0s' }}
        />
      ))}
    </div>
  );
};

export function PlayerHealthDisplay({ 
  playerName, 
  playerHealth, 
  playerStamina,
  geminiName, 
  geminiHealth, 
  geminiStamina,
  maxHealth,
  maxStamina
}: PlayerHealthDisplayProps) {
  return (
    <Card className="bg-card/70 backdrop-blur-sm shadow-md border-secondary/30">
      <CardContent className="p-3 sm:p-4 grid grid-cols-2 gap-3 sm:gap-4">
        {/* Player Stats */}
        <div className="flex flex-col items-center gap-2 text-center border-r border-border/50 pr-2 sm:pr-3">
          <h3 className="text-sm sm:text-base font-semibold text-primary-foreground">{playerName}</h3>
          <div className="flex flex-col items-center gap-1">
            <StatIconDisplay 
              currentValue={playerHealth} 
              maxValue={maxHealth} 
              IconComponent={Heart}
              iconColorClass="text-red-500"
              fillColorClass="fill-red-500"
              pulse={true}
            />
            <p className="text-xs text-muted-foreground">Health: ({playerHealth}/{maxHealth})</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <StatIconDisplay 
              currentValue={playerStamina} 
              maxValue={maxStamina} 
              IconComponent={Zap} // Using Zap for stamina
              iconColorClass="text-yellow-400" // Stamina color
              fillColorClass="fill-yellow-400"
            />
             <p className="text-xs text-muted-foreground">Stamina: ({playerStamina}/{maxStamina})</p>
          </div>
        </div>

        {/* Gemini Stats */}
        <div className="flex flex-col items-center gap-2 text-center pl-2 sm:pl-3">
          <h3 className="text-sm sm:text-base font-semibold text-accent flex items-center">
            <Bot className="mr-1.5 h-4 w-4 sm:h-5 sm:w-5" /> {geminiName}
          </h3>
          <div className="flex flex-col items-center gap-1">
            <StatIconDisplay 
              currentValue={geminiHealth} 
              maxValue={maxHealth} 
              IconComponent={Heart}
              iconColorClass="text-red-500"
              fillColorClass="fill-red-500"
              pulse={true}
            />
             <p className="text-xs text-muted-foreground">Health: ({geminiHealth}/{maxHealth})</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <StatIconDisplay 
              currentValue={geminiStamina} 
              maxValue={maxStamina} 
              IconComponent={Zap} 
              iconColorClass="text-yellow-400"
              fillColorClass="fill-yellow-400"
            />
            <p className="text-xs text-muted-foreground">Stamina: ({geminiStamina}/{maxStamina})</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
