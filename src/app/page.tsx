
"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
import { StartMenu } from '@/components/menu/StartMenu';
import { AlertCircle, RotateCcw, HelpCircleIcon, SaveIcon } from 'lucide-react';
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
  sceneDescription: "The air is thick with an unknown dread...", // Generic starting point
  challenge: "",
  availableChoices: [],
  userSelectedChoice: null,
  geminiSelectedChoice: null,
  geminiReasoning: null,
  geminiHint: null,
  geminiIsStuck: false,
  isPlayerTurn: false,
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

const PREDEFINED_INITIAL_SCENARIOS: Array<{ scene: string; initialChallenge: string; firstNarration: string }> = [
  {
    scene: "You and your AI companion awaken strapped to cold, metallic tables in a blood-splattered operating room. The acrid smell of chemicals and decay fills your nostrils. A single, bare bulb buzzes erratically overhead.",
    initialChallenge: "Find a way to free yourselves before whoever, or whatever, did this returns.",
    firstNarration: "Panic sets in as the grim reality of your situation becomes clear. The room is a grotesque parody of medical science."
  },
  {
    scene: "A disorienting jolt, and you find yourselves in the cramped, musty confines of a coffin, buried alive. Your AI companion's voice, though digital, sounds strained. Dirt trickles in from the lid above.",
    initialChallenge: "Escape the suffocating darkness before your air runs out.",
    firstNarration: "The oppressive darkness and the weight of the earth above press down on you. Claustrophobia is an immediate, unwelcome guest."
  },
  {
    scene: "The world materializes around you as a derelict, fog-shrouded Victorian manor. Skeletal trees claw at the sky. Your AI companion shivers, or its digital equivalent. An unseen presence watches from the darkened windows.",
    initialChallenge: "Seek shelter and uncover the manor's dark secrets, or flee into the treacherous fog.",
    firstNarration: "A chilling wind whips through the decaying grandeur of the estate. Every shadow seems to writhe with untold horrors."
  },
  {
    scene: "You awaken on a rickety raft adrift on an oily, black ocean under a blood-red moon. Strange, bioluminescent creatures pulse in the abyssal depths below. Your AI companion reports critical system errors from saltwater corrosion.",
    initialChallenge: "Navigate the treacherous waters and find land, all while avoiding the horrors beneath.",
    firstNarration: "The endless, unnatural ocean stretches in all directions. The silence is broken only by the lapping of waves and the unsettling clicks from below."
  }
];


function getDynamicChoices(sceneDescription: string, challenge: string, turnCount: number): string[] {
  const baseIndex = turnCount * 3; // Ensure this doesn't go out of bounds for smaller pools
  return [
    STATIC_CHOICES_POOL[(baseIndex) % STATIC_CHOICES_POOL.length],
    STATIC_CHOICES_POOL[(baseIndex + 1) % STATIC_CHOICES_POOL.length],
    STATIC_CHOICES_POOL[(baseIndex + 2) % STATIC_CHOICES_POOL.length],
  ];
}

const SAVE_GAME_KEY = 'dualDreadSaveData';

export default function DualDreadPage() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [sceneImageUrl, setSceneImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [saveFileExists, setSaveFileExists] = useState(false);

  useEffect(() => {
    // Check for save file on mount (client-side only)
    if (localStorage.getItem(SAVE_GAME_KEY)) {
      setSaveFileExists(true);
    }
  }, []);


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
    setImageLoading(false);
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
      setImageError(`Image generation error: ${errMessage.slice(0,150)}`);
    } finally {
      setImageLoading(false);
    }
  }, []);

  const initializeNewGame = useCallback(async () => {
    setLoading(true);
    setGameState(initialGameState); // Reset to base initial state first
    setSceneImageUrl(null);
    setImageError(null);

    const randomScenario = PREDEFINED_INITIAL_SCENARIOS[Math.floor(Math.random() * PREDEFINED_INITIAL_SCENARIOS.length)];

    try {
      // Use narrateAdventure to get the first proper narration based on the random start.
      // This makes the AI "aware" of the starting scenario.
      const initialNarrationInput: NarrateAdventureInput = {
        userChoice: "We've just appeared here, terrified and confused.", // Player's initial implicit action
        geminiChoice: "My sensors are picking up unusual readings. This is not good.", // Gemini's initial reaction
        currentSceneDescription: randomScenario.scene, // Use the scene from the random scenario
      };
      const response = await narrateAdventure(initialNarrationInput);
      
      setGameState(prev => ({
        ...initialGameState, // Ensure a clean slate
        narration: response.narration || randomScenario.firstNarration, // Fallback to predefined first narration
        sceneDescription: response.sceneDescription || randomScenario.scene,
        challenge: response.challenge || randomScenario.initialChallenge,
        availableChoices: getDynamicChoices(response.sceneDescription || randomScenario.scene, response.challenge || randomScenario.initialChallenge, 0),
        isPlayerTurn: true,
        turnCount: 1,
        gameOver: false,
        errorMessage: null,
      }));
    } catch (error) {
      handleError(error, "Failed to initialize new game narration");
      // Fallback to a simpler setup if narration fails
       setGameState(prev => ({
        ...initialGameState,
        narration: randomScenario.firstNarration,
        sceneDescription: randomScenario.scene,
        challenge: randomScenario.initialChallenge,
        availableChoices: getDynamicChoices(randomScenario.scene, randomScenario.initialChallenge, 0),
        isPlayerTurn: true,
        turnCount: 1,
      }));
    } finally {
      setLoading(false);
    }
  }, [handleError]);


  useEffect(() => {
    if (gameStarted && gameState.sceneDescription && !gameState.gameOver && !loading) {
      handleGenerateSceneImage(gameState.sceneDescription);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.sceneDescription, gameState.gameOver, gameStarted]);


  const handleStartNewGame = () => {
    setGameStarted(true);
    initializeNewGame();
  };
  
  const handleOpenSettings = () => {
    toast({
      title: "Settings",
      description: "Game configuration options will be available here soon!",
      duration: 3000,
    });
  };

  const saveGame = () => {
    if (gameState.gameOver) {
      toast({ title: "Cannot Save", description: "The story has concluded.", variant: "destructive" });
      return;
    }
    try {
      const saveData = {
        gameState,
        sceneImageUrl,
      };
      localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(saveData));
      setSaveFileExists(true);
      toast({ title: "Progress Saved", description: "Your dread has been chronicled." });
    } catch (error) {
      handleError(error, "Failed to save game");
    }
  };

  const loadGame = () => {
    setLoading(true);
    try {
      const savedDataString = localStorage.getItem(SAVE_GAME_KEY);
      if (savedDataString) {
        const savedData = JSON.parse(savedDataString);
        setGameState(savedData.gameState);
        setSceneImageUrl(savedData.sceneImageUrl || null); // Handle potentially missing image URL
        setGameStarted(true);
        setImageError(null); // Reset image error on load
        setImageLoading(false); // Reset image loading on load
        toast({ title: "Game Loaded", description: "The nightmare continues..." });

        // Ensure choices are available if game is not over
        if (!savedData.gameState.gameOver && savedData.gameState.availableChoices.length === 0) {
            setGameState(prev => ({
                ...prev,
                availableChoices: getDynamicChoices(prev.sceneDescription, prev.challenge, prev.turnCount-1)
            }));
        }

      } else {
        toast({ title: "Load Failed", description: "No prior dread found to relive.", variant: "destructive" });
      }
    } catch (error) {
      handleError(error, "Failed to load game");
      // If load fails, might be good to initialize a new game or go back to start menu
      setGameStarted(false); 
    } finally {
      setLoading(false);
    }
  };


  const handlePlayerChoice = async (playerChoice: string) => {
    if (gameState.gameOver || !gameState.isPlayerTurn) return;

    setLoading(true);
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
                          narrationResponse.challenge.toLowerCase().includes("you have perished") ||
                          narrationResponse.sceneDescription.toLowerCase().includes("the end.");

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
          description: narrationResponse.narration || "The cycle of dread concludes... for now.",
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
      setLoading(false);
    }
  };

  const handleRestartGame = () => {
    setGameStarted(true); // Keep game started, but re-initialize
    initializeNewGame(); 
  };
  
  const handleGeminiStuck = () => {
    if (gameState.gameOver || !gameState.isPlayerTurn) return;
    setGameState(prev => ({ ...prev, geminiIsStuck: true }));
    toast({
      title: "Hint Requested",
      description: "Gemini will try to provide a hint in its next reasoning.",
    });
  };

  if (!gameStarted) {
    return <StartMenu onStartGame={handleStartNewGame} onOpenSettings={handleOpenSettings} onLoadGame={loadGame} saveFileExists={saveFileExists} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-background to-secondary/50 relative">
      <header className="w-full max-w-3xl mb-8 text-center">
        <h1 className="font-horror text-5xl sm:text-6xl md:text-7xl text-primary animate-pulse">Dual Dread</h1>
        <p className="text-lg text-muted-foreground italic mt-2">A cooperative horror text adventure.</p>
      </header>

      <main className="w-full max-w-3xl space-y-6">
        {loading && !gameState.narration && gameStarted && (
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
            disabled={loading || !gameState.isPlayerTurn || imageLoading}
          />
        )}

        {loading && gameState.isPlayerTurn && !!gameState.userSelectedChoice && ( // This is when player made a choice, waiting for AI.
           <div className="flex justify-center py-4">
             <LoadingSpinner message="The other side contemplates..." />
           </div>
        )}
         {loading && !gameState.isPlayerTurn && !gameState.userSelectedChoice && ( // This is initial game load or AI has responded, now narrating
           <div className="flex justify-center py-4">
             <LoadingSpinner message="The story unfolds..." />
           </div>
        )}

        
        {gameState.gameOver && (
          <div className="text-center p-6 bg-card/80 backdrop-blur-sm rounded-lg shadow-xl">
            <h2 className="font-horror text-4xl text-destructive mb-4">Game Over</h2>
            <p className="text-muted-foreground mb-6">{gameState.narration || "The darkness consumes all."}</p>
            <Button onClick={handleRestartGame} variant="default" size="lg" className="font-horror">
              <RotateCcw className="mr-2 h-5 w-5" /> Face the Dread Again?
            </Button>
          </div>
        )}

        {!gameState.gameOver && (
          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button onClick={saveGame} variant="outline" className="border-primary/50 hover:bg-primary/10">
              <SaveIcon className="mr-2 h-4 w-4" /> Save Your Sanity
            </Button>
            <Button onClick={handleRestartGame} variant="outline" className="border-primary/50 hover:bg-primary/10">
              <RotateCcw className="mr-2 h-4 w-4" /> Restart Adventure
            </Button>
            {gameState.isPlayerTurn && !loading && (
              <Button onClick={handleGeminiStuck} variant="outline" className="border-accent/50 hover:bg-accent/10 text-accent" disabled={imageLoading || loading}>
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
    </div>
  );
}
