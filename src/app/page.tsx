
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { narrateAdventure, type NarrateAdventureInput, type NarrateAdventureOutput } from '@/ai/flows/narrate-adventure';
import { interpretChoices, type InterpretChoicesInput, type InterpretChoicesOutput } from '@/ai/flows/interpret-choices';
import { generateSceneImage, type GenerateSceneImageInput } from '@/ai/flows/generate-scene-image-flow';

import { SceneDisplay } from '@/components/game/SceneDisplay';
import { PlayerInputArea } from '@/components/game/PlayerInputArea';
import { GeminiStatus } from '@/components/game/GeminiStatus';
import { LoadingSpinner } from '@/components/game/LoadingSpinner';
import { SceneVisualization } from '@/components/game/SceneVisualization';
import { AlertCircle, RotateCcw, HelpCircleIcon } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

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
  const baseIndex = turnCount * 3;
  return [
    STATIC_CHOICES_POOL[(baseIndex) % STATIC_CHOICES_POOL.length],
    STATIC_CHOICES_POOL[(baseIndex + 1) % STATIC_CHOICES_POOL.length],
    STATIC_CHOICES_POOL[(baseIndex + 2) % STATIC_CHOICES_POOL.length],
  ];
}


export default function DualDreadPage() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [loading, setLoading] = useState(true); // Main game logic loading
  const { toast } = useToast();

  const [sceneImageUrl, setSceneImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

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
    setImageLoading(false); // Ensure image loading also stops on general error
  }, [toast]);

  const handleGenerateSceneImage = useCallback(async (currentSceneDescription: string) => {
    if (!currentSceneDescription) return;
    setImageLoading(true);
    setImageError(null);
    try {
      const imageInput: GenerateSceneImageInput = { sceneDescription: currentSceneDescription };
      const imageResponse = await generateSceneImage(imageInput);
      setSceneImageUrl(imageResponse.imageDataUri);
    } catch (error) {
      console.error("Failed to generate scene image:", error);
      const errMessage = error instanceof Error ? error.message : String(error);
      setImageError(`Image generation error: ${errMessage.slice(0,150)}`); // Truncate long messages
      // setSceneImageUrl(null); // Optionally clear previous image on error, or keep it
    } finally {
      setImageLoading(false);
    }
  }, []);


  const initializeGame = useCallback(async () => {
    setLoading(true);
    setGameState(prev => ({ ...prev, errorMessage: null }));
    setSceneImageUrl(null); // Clear previous image
    setImageError(null);

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
        sceneDescription: response.sceneDescription,
        challenge: response.challenge,
        availableChoices: getDynamicChoices(response.sceneDescription, response.challenge, prev.turnCount),
        isPlayerTurn: true,
        turnCount: prev.turnCount + 1,
      }));
      // Image generation will be triggered by useEffect watching sceneDescription
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

  // Effect to generate image when scene description changes and game is active
  useEffect(() => {
    if (gameState.sceneDescription && !gameState.gameOver && !loading) {
      handleGenerateSceneImage(gameState.sceneDescription);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.sceneDescription, gameState.gameOver]); // handleGenerateSceneImage is memoized

  const handlePlayerChoice = async (playerChoice: string) => {
    if (gameState.gameOver || !gameState.isPlayerTurn) return;

    setLoading(true); // For game logic
    setGameState(prev => ({
      ...prev,
      userSelectedChoice: playerChoice,
      isPlayerTurn: false,
      errorMessage: null,
      geminiSelectedChoice: null, 
      geminiReasoning: null,
      geminiHint: null,
    }));

    try {
      const interpretInput: InterpretChoicesInput = {
        sceneDescription: gameState.sceneDescription,
        playerChoices: gameState.availableChoices, 
        geminiStuck: gameState.geminiIsStuck,
      };
      const geminiResponse = await interpretChoices(interpretInput);
      
      setGameState(prev => ({
        ...prev,
        geminiSelectedChoice: geminiResponse.chosenOption,
        geminiReasoning: geminiResponse.reasoning,
        geminiHint: geminiResponse.hint || null,
        geminiIsStuck: false, 
      }));

      const narrateInput: NarrateAdventureInput = {
        userChoice: playerChoice,
        geminiChoice: geminiResponse.chosenOption,
        currentSceneDescription: gameState.sceneDescription, 
      };
      const narrationResponse = await narrateAdventure(narrateInput);

      const newGameOver = narrationResponse.narration.toLowerCase().includes("game over") ||
                          narrationResponse.challenge.toLowerCase().includes("you have perished");

      setGameState(prev => ({
        ...prev,
        narration: narrationResponse.narration,
        sceneDescription: narrationResponse.sceneDescription, // This will trigger image generation via useEffect
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
      setGameState(prev => ({
        ...prev,
        isPlayerTurn: true,
        userSelectedChoice: null, 
      }));
    } finally {
      setLoading(false); // For game logic
    }
  };

  const handleRestartGame = () => {
    setGameState(initialGameState);
    setSceneImageUrl(null);
    setImageError(null);
    setImageLoading(false);
    initializeGame();
  };
  
  const handleGeminiStuck = () => {
    if (gameState.gameOver || !gameState.isPlayerTurn) return;
    setGameState(prev => ({ ...prev, geminiIsStuck: true }));
    toast({
      title: "Hint Requested",
      description: "Gemini will try to provide a hint in its next reasoning.",
    });
  };


  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-background to-secondary/50 relative">
      <header className="w-full max-w-3xl mb-8 text-center">
        <h1 className="font-horror text-5xl sm:text-6xl md:text-7xl text-primary animate-pulse">Dual Dread</h1>
        <p className="text-lg text-muted-foreground italic mt-2">A cooperative horror text adventure.</p>
      </header>

      <main className="w-full max-w-3xl space-y-6">
        {loading && !gameState.narration && ( // Initial game loading spinner
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
        
        <SceneVisualization
          imageUrl={sceneImageUrl}
          isLoading={imageLoading}
          error={imageError}
          sceneDescription={gameState.sceneDescription}
        />
        
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
            disabled={loading || !gameState.isPlayerTurn || imageLoading} // Also disable input if image is loading
          />
        )}

        {loading && gameState.isPlayerTurn && !!gameState.userSelectedChoice && ( // This is for Gemini's turn loading
          <div className="flex justify-center py-4">
            <LoadingSpinner message="Awaiting Gemini's counsel..." />
          </div>
        )}
        
        {gameState.gameOver && (
          <div className="text-center p-6 bg-card/80 backdrop-blur-sm rounded-lg shadow-xl">
            <h2 className="font-horror text-4xl text-destructive mb-4">Game Over</h2>
            <p className="text-muted-foreground mb-6">{gameState.narration || "The darkness consumes all."}</p>
            <Button onClick={handleRestartGame} variant="default" size="lg"> {/* Changed variant to default from primary for better theme fit*/}
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
              <Button onClick={handleGeminiStuck} variant="outline" className="border-accent/50 hover:bg-accent/10 text-accent" disabled={imageLoading}>
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
