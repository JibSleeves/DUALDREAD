"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { narrateAdventure, type NarrateAdventureInput, type NarrateAdventureOutput } from '@/ai/flows/narrate-adventure';
import { interpretChoices, type InterpretChoicesInput, type InterpretChoicesOutput } from '@/ai/flows/interpret-choices';

import { SceneDisplay } from '@/components/game/SceneDisplay';
import { PlayerInputArea } from '@/components/game/PlayerInputArea';
import { GeminiStatus } from '@/components/game/GeminiStatus';
import { LoadingSpinner } from '@/components/game/LoadingSpinner';
import { AlertCircle, RotateCcw, HelpCircleIcon } from 'lucide-react';

// Define a more structured game state
interface GameState {
  narration: string;
  sceneDescription: string;
  challenge: string;
  availableChoices: string[];
  userSelectedChoice: string | null;
  geminiSelectedChoice: string | null;
  geminiReasoning: string | null;
  geminiHint: string | null;
  geminiIsStuck: boolean;
  isPlayerTurn: boolean;
  gameOver: boolean;
  errorMessage: string | null;
  turnCount: number;
}

const initialGameState: GameState = {
  narration: "",
  sceneDescription: "You and your AI companion awaken in a dark, eerie cellar. A palpable sense of dread hangs in the air. The only light flickers from a distant, unknown source...",
  challenge: "",
  availableChoices: [],
  userSelectedChoice: null,
  geminiSelectedChoice: null,
  geminiReasoning: null,
  geminiHint: null,
  geminiIsStuck: false,
  isPlayerTurn: false, // Will be set to true after initial narration
  gameOver: false,
  errorMessage: null,
  turnCount: 0,
};

const STATIC_CHOICES_POOL = [
  "Cautiously investigate the immediate surroundings.",
  "Try to find a way out of this area.",
  "Communicate with your companion about the situation.",
  "Listen carefully for any sounds or clues.",
  "Search for any useful items nearby.",
  "Examine the most unsettling feature of the room."
];

function getDynamicChoices(sceneDescription: string, challenge: string, turnCount: number): string[] {
  // Simple example: cycle through choices, could be made more sophisticated
  const baseIndex = turnCount * 3;
  return [
    STATIC_CHOICES_POOL[(baseIndex) % STATIC_CHOICES_POOL.length],
    STATIC_CHOICES_POOL[(baseIndex + 1) % STATIC_CHOICES_POOL.length],
    STATIC_CHOICES_POOL[(baseIndex + 2) % STATIC_CHOICES_POOL.length],
  ];
}


export default function DualDreadPage() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const handleError = useCallback((error: any, message: string) => {
    console.error(message, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    setGameState(prev => ({ ...prev, errorMessage: `${message}: ${errorMessage}`, isPlayerTurn: true }));
    toast({
      title: "An Error Occurred",
      description: `${message}. Please try again.`,
      variant: "destructive",
    });
    setLoading(false);
  }, [toast]);

  const initializeGame = useCallback(async () => {
    setLoading(true);
    setGameState(prev => ({ ...prev, errorMessage: null }));
    try {
      const initialNarrationInput: NarrateAdventureInput = {
        userChoice: "We've awakened in this dreadful place.",
        geminiChoice: "I sense danger. We must be cautious.",
        currentSceneDescription: initialGameState.sceneDescription,
      };
      const response = await narrateAdventure(initialNarrationInput);
      
      setGameState(prev => ({
        ...prev,
        narration: response.narration,
        sceneDescription: response.sceneDescription, // AI might update this
        challenge: response.challenge,
        availableChoices: getDynamicChoices(response.sceneDescription, response.challenge, prev.turnCount),
        isPlayerTurn: true,
        turnCount: prev.turnCount + 1,
      }));
    } catch (error) {
      handleError(error, "Failed to initialize game narration");
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    initializeGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initialize game on mount

  const handlePlayerChoice = async (playerChoice: string) => {
    if (gameState.gameOver || !gameState.isPlayerTurn) return;

    setLoading(true);
    setGameState(prev => ({
      ...prev,
      userSelectedChoice: playerChoice,
      isPlayerTurn: false,
      errorMessage: null,
      geminiSelectedChoice: null, // Clear previous Gemini choice
      geminiReasoning: null,
      geminiHint: null,
    }));

    try {
      // Gemini interprets and makes its choice
      const interpretInput: InterpretChoicesInput = {
        sceneDescription: gameState.sceneDescription,
        playerChoices: gameState.availableChoices, // Gemini chooses from the same set of options for now
        geminiStuck: gameState.geminiIsStuck,
      };
      const geminiResponse = await interpretChoices(interpretInput);
      
      setGameState(prev => ({
        ...prev,
        geminiSelectedChoice: geminiResponse.chosenOption,
        geminiReasoning: geminiResponse.reasoning,
        geminiHint: geminiResponse.hint || null,
        geminiIsStuck: false, // Reset stuck status after an attempt
      }));

      // Proceed to next narration step
      const narrateInput: NarrateAdventureInput = {
        userChoice: playerChoice,
        geminiChoice: geminiResponse.chosenOption,
        currentSceneDescription: gameState.sceneDescription, // Scene before this turn's actions
      };
      const narrationResponse = await narrateAdventure(narrateInput);

      // Check for game over conditions (simplified)
      const newGameOver = narrationResponse.narration.toLowerCase().includes("game over") ||
                          narrationResponse.challenge.toLowerCase().includes("you have perished");

      setGameState(prev => ({
        ...prev,
        narration: narrationResponse.narration,
        sceneDescription: narrationResponse.sceneDescription,
        challenge: narrationResponse.challenge,
        availableChoices: newGameOver ? [] : getDynamicChoices(narrationResponse.sceneDescription, narrationResponse.challenge, prev.turnCount),
        isPlayerTurn: !newGameOver,
        gameOver: newGameOver,
        turnCount: prev.turnCount + 1,
      }));

      if (newGameOver) {
        toast({
          title: "The End?",
          description: narrationResponse.narration,
          variant: "destructive",
          duration: 10000,
        });
      }

    } catch (error) {
      handleError(error, "Failed to process turn");
      // Rollback player turn if Gemini or narration fails
      setGameState(prev => ({
        ...prev,
        isPlayerTurn: true,
        userSelectedChoice: null, // Clear selection if error
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleRestartGame = () => {
    setGameState(initialGameState);
    initializeGame();
  };
  
  const handleGeminiStuck = () => {
    if (gameState.gameOver || !gameState.isPlayerTurn) return;
    setGameState(prev => ({ ...prev, geminiIsStuck: true }));
    toast({
      title: "Hint Requested",
      description: "Gemini will try to provide a hint in its next reasoning.",
    });
    // Player still needs to make a choice to trigger Gemini's response
  };


  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-background to-secondary/50 relative">
      <header className="w-full max-w-3xl mb-8 text-center">
        <h1 className="font-horror text-5xl sm:text-6xl md:text-7xl text-primary animate-pulse">Dual Dread</h1>
        <p className="text-lg text-muted-foreground italic mt-2">A cooperative horror text adventure.</p>
      </header>

      <main className="w-full max-w-3xl space-y-6">
        {loading && !gameState.narration && (
          <div className="flex flex-col items-center justify-center h-64">
            <LoadingSpinner size={64} message="Awakening the horrors..." />
          </div>
        )}

        {!loading && gameState.errorMessage && (
          <div className="bg-destructive/20 border border-destructive text-destructive-foreground p-4 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{gameState.errorMessage}</p>
          </div>
        )}
        
        <SceneDisplay
          narration={gameState.narration}
          sceneDescription={gameState.sceneDescription}
          challenge={gameState.challenge}
        />

        <AnimatePresence>
        {(gameState.geminiSelectedChoice || gameState.geminiReasoning || gameState.geminiHint || (loading && !gameState.isPlayerTurn && gameState.userSelectedChoice)) && (
          <GeminiStatus
            geminiChoice={gameState.geminiSelectedChoice}
            geminiReasoning={gameState.geminiReasoning}
            geminiHint={gameState.geminiHint}
            loading={loading && !gameState.isPlayerTurn && !!gameState.userSelectedChoice}
          />
        )}
        </AnimatePresence>


        {!gameState.gameOver && gameState.isPlayerTurn && !loading && (
          <PlayerInputArea
            choices={gameState.availableChoices}
            onChoiceSelect={handlePlayerChoice}
            disabled={loading || !gameState.isPlayerTurn}
          />
        )}

        {loading && gameState.isPlayerTurn && !!gameState.userSelectedChoice && (
          <div className="flex justify-center py-4">
            <LoadingSpinner message="Awaiting Gemini's counsel..." />
          </div>
        )}
        
        {gameState.gameOver && (
          <div className="text-center p-6 bg-card/80 backdrop-blur-sm rounded-lg shadow-xl">
            <h2 className="font-horror text-4xl text-destructive mb-4">Game Over</h2>
            <p className="text-muted-foreground mb-6">{gameState.narration || "The darkness consumes all."}</p>
            <Button onClick={handleRestartGame} variant="primary" size="lg">
              <RotateCcw className="mr-2 h-5 w-5" /> Try Again?
            </Button>
          </div>
        )}

        {!gameState.gameOver && (
          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button onClick={handleRestartGame} variant="outline" className="border-primary/50 hover:bg-primary/10">
              <RotateCcw className="mr-2 h-4 w-4" /> Restart Adventure
            </Button>
            {gameState.isPlayerTurn && !loading && (
              <Button onClick={handleGeminiStuck} variant="outline" className="border-accent/50 hover:bg-accent/10 text-accent">
                 <HelpCircleIcon className="mr-2 h-4 w-4" /> I'm Stuck (Hint for Gemini)
              </Button>
            )}
          </div>
        )}
      </main>
      
      <footer className="w-full max-w-3xl mt-12 text-center">
        <p className="text-sm text-muted-foreground/70">
          Dual Dread &copy; {new Date().getFullYear()}. All rights reserved.
        </p>
      </footer>
       <div className="absolute top-4 right-4">
         <Image src="https://placehold.co/100x50.png?text=Logo" alt="Dual Dread Logo" width={100} height={50} data-ai-hint="horror logo" className="opacity-70" />
       </div>
    </div>
  );
}

// AnimatePresence for GeminiStatus component
import { AnimatePresence } from 'framer-motion';
