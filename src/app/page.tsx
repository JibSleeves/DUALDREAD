
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
import { PlayerHealthDisplay } from '@/components/game/PlayerHealthDisplay';
import { AlertCircle, RotateCcw, HelpCircleIcon, SaveIcon } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

const MAX_HEALTH = 2;

// Define a more structured game state
interface GameState {
  narration: string;
  sceneDescription: string;
  challenge: string;
  availableChoices: string[];
  userSelectedChoice: string | null;
  geminiSelectedChoice: string | null;
  geminiReasoning: string | null;
  isPlayerTurn: boolean;
  gameOver: boolean;
  errorMessage: string | null;
  turnCount: number;
  playerHealth: number;
  geminiHealth: number;
  // Removed geminiHint and geminiIsStuck as Gemini is now an active participant
}

const initialGameState: GameState = {
  narration: "",
  sceneDescription: "The air is thick with an unknown dread...",
  challenge: "",
  availableChoices: [],
  userSelectedChoice: null,
  geminiSelectedChoice: null,
  geminiReasoning: null,
  isPlayerTurn: false,
  gameOver: false,
  errorMessage: null,
  turnCount: 0,
  playerHealth: MAX_HEALTH,
  geminiHealth: MAX_HEALTH,
};

const STATIC_CHOICES_POOL = [
  "Cautiously investigate the immediate surroundings.",
  "Try to find a way out of this area.",
  "Communicate with your companion about the situation.",
  "Listen carefully for any sounds or clues.",
  "Search for any useful items nearby.",
  "Examine the most unsettling feature of the room.",
  "Check for escape routes.",
  "Prepare a defensive position.",
  "Call out to see if anyone else is there."
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
  // Generate a more varied set of choices
  const uniqueChoices = new Set<string>();
  const basePool = [...STATIC_CHOICES_POOL]; // Create a mutable copy

  // Attempt to add more variety, potentially by shuffling or picking more randomly
  for (let i = basePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [basePool[i], basePool[j]] = [basePool[j], basePool[i]]; // Shuffle
  }
  
  while(uniqueChoices.size < 3 && basePool.length > 0) {
    const choiceIndex = Math.floor(Math.random() * basePool.length);
    uniqueChoices.add(basePool.splice(choiceIndex, 1)[0]);
  }
  // Fallback if not enough unique choices are generated
  if (uniqueChoices.size < 3) {
    STATIC_CHOICES_POOL.slice(0, 3 - uniqueChoices.size).forEach(c => uniqueChoices.add(c));
  }
  
  return Array.from(uniqueChoices);
}

const SAVE_GAME_KEY = 'dualDreadSaveData_v2'; // Increment version if state structure changes significantly

export default function DualDreadPage() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading...");
  const { toast } = useToast();

  const [sceneImageUrl, setSceneImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [saveFileExists, setSaveFileExists] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(SAVE_GAME_KEY)) {
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
    setLoadingMessage("Awakening the horrors...");
    setGameState(initialGameState); 
    setSceneImageUrl(null);
    setImageError(null);

    const randomScenario = PREDEFINED_INITIAL_SCENARIOS[Math.floor(Math.random() * PREDEFINED_INITIAL_SCENARIOS.length)];

    try {
      const initialNarrationInput: NarrateAdventureInput = {
        userChoice: "We've just appeared here, terrified and confused.",
        geminiChoice: "My sensors are picking up unusual readings. This is not good.",
        currentSceneDescription: randomScenario.scene,
        playerHealth: MAX_HEALTH,
        geminiHealth: MAX_HEALTH,
      };
      const response = await narrateAdventure(initialNarrationInput);
      
      setGameState(prev => ({
        ...initialGameState,
        narration: response.narration || randomScenario.firstNarration,
        sceneDescription: response.sceneDescription || randomScenario.scene,
        challenge: response.challenge || randomScenario.initialChallenge,
        availableChoices: getDynamicChoices(response.sceneDescription || randomScenario.scene, response.challenge || randomScenario.initialChallenge, 0),
        playerHealth: response.updatedPlayerHealth,
        geminiHealth: response.updatedGeminiHealth,
        isPlayerTurn: !response.isGameOver,
        gameOver: response.isGameOver,
        turnCount: 1,
        errorMessage: null,
      }));

      if (response.isGameOver) {
         toast({
          title: "Doomed From The Start",
          description: response.narration || "The dread consumed you before you could even act.",
          variant: "destructive",
          duration: 10000,
        });
      }

    } catch (error) {
      handleError(error, "Failed to initialize new game narration");
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
  }, [handleError, toast]);


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
    setLoadingMessage("Reliving past dread...");
    try {
      const savedDataString = localStorage.getItem(SAVE_GAME_KEY);
      if (savedDataString) {
        const savedData = JSON.parse(savedDataString);
        // Ensure health is initialized if loading older save data
        const loadedGameState = {
          ...initialGameState, // Start with defaults
          ...savedData.gameState, // Override with saved data
          playerHealth: savedData.gameState.playerHealth !== undefined ? savedData.gameState.playerHealth : MAX_HEALTH,
          geminiHealth: savedData.gameState.geminiHealth !== undefined ? savedData.gameState.geminiHealth : MAX_HEALTH,
        };

        setGameState(loadedGameState);
        setSceneImageUrl(savedData.sceneImageUrl || null);
        setGameStarted(true);
        setImageError(null);
        setImageLoading(false);
        toast({ title: "Game Loaded", description: "The nightmare continues..." });

        if (!loadedGameState.gameOver && loadedGameState.availableChoices.length === 0) {
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
      setGameStarted(false); 
    } finally {
      setLoading(false);
    }
  };


  const handlePlayerChoice = async (playerChoice: string) => {
    if (gameState.gameOver || !gameState.isPlayerTurn) return;

    setLoading(true);
    setLoadingMessage("Gemini is contemplating its move...");
    setGameState(prev => ({
      ...prev,
      userSelectedChoice: playerChoice,
      isPlayerTurn: false,
      errorMessage: null,
      geminiSelectedChoice: null, 
      geminiReasoning: null,
    }));

    try {
      // Gemini's Turn
      const interpretInput: InterpretChoicesInput = {
        sceneDescription: gameState.sceneDescription,
        availableChoices: gameState.availableChoices, 
        currentGeminiHealth: gameState.geminiHealth,
      };
      const geminiResponse = await interpretChoices(interpretInput);
      
      setLoadingMessage("The story unfolds...");
      setGameState(prev => ({
        ...prev,
        geminiSelectedChoice: geminiResponse.chosenOption,
        geminiReasoning: geminiResponse.reasoning,
      }));

      // Narration based on both choices
      const narrateInput: NarrateAdventureInput = {
        userChoice: playerChoice,
        geminiChoice: geminiResponse.chosenOption,
        currentSceneDescription: gameState.sceneDescription, 
        playerHealth: gameState.playerHealth,
        geminiHealth: gameState.geminiHealth,
      };
      const narrationResponse = await narrateAdventure(narrateInput);

      setGameState(prev => ({
        ...prev,
        narration: narrationResponse.narration,
        sceneDescription: narrationResponse.sceneDescription,
        challenge: narrationResponse.challenge,
        playerHealth: narrationResponse.updatedPlayerHealth,
        geminiHealth: narrationResponse.updatedGeminiHealth,
        availableChoices: narrationResponse.isGameOver ? [] : getDynamicChoices(narrationResponse.sceneDescription, narrationResponse.challenge, prev.turnCount),
        isPlayerTurn: !narrationResponse.isGameOver,
        gameOver: narrationResponse.isGameOver,
        turnCount: prev.turnCount + 1,
      }));

      if (narrationResponse.isGameOver) {
        toast({
          title: narrationResponse.updatedPlayerHealth <= 0 && narrationResponse.updatedGeminiHealth <= 0 ? "Mutual Destruction" 
               : narrationResponse.updatedPlayerHealth <= 0 ? "Your Demise" 
               : "Gemini's Demise",
          description: narrationResponse.narration || "The cycle of dread concludes... for now.",
          variant: "destructive",
          duration: 10000,
        });
      }

    } catch (error) {
      handleError(error, "Failed to process turn");
      setGameState(prev => ({
        ...prev,
        isPlayerTurn: true, // Give player control back on error
        userSelectedChoice: null, 
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleRestartGame = () => {
    setGameStarted(true);
    initializeNewGame(); 
  };
  
  // Removed handleGeminiStuck as Gemini is now an active participant.

  if (!gameStarted) {
    return <StartMenu onStartGame={handleStartNewGame} onOpenSettings={handleOpenSettings} onLoadGame={loadGame} saveFileExists={saveFileExists} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-background to-secondary/50 relative">
      <header className="w-full max-w-3xl mb-6 text-center">
        <h1 className="font-horror text-5xl sm:text-6xl md:text-7xl text-primary animate-pulse">Dual Dread</h1>
        <p className="text-lg text-muted-foreground italic mt-2">A cooperative horror text adventure.</p>
      </header>

      <main className="w-full max-w-3xl space-y-6">
        {loading && !gameState.narration && gameStarted && (
          <div className="flex flex-col items-center justify-center h-64">
            <LoadingSpinner size={64} message={loadingMessage} />
          </div>
        )}

        {!loading && gameState.errorMessage && (
          <div className="bg-destructive/20 border border-destructive text-destructive-foreground p-4 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{gameState.errorMessage}</p>
          </div>
        )}
        
        <PlayerHealthDisplay 
          playerName="You" 
          playerHealth={gameState.playerHealth}
          geminiName="Gemini"
          geminiHealth={gameState.geminiHealth}
          maxHealth={MAX_HEALTH}
        />

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
        {(gameState.geminiSelectedChoice || gameState.geminiReasoning || (loading && !gameState.isPlayerTurn && gameState.userSelectedChoice)) && (
          <GeminiStatus
            geminiChoice={gameState.geminiSelectedChoice}
            geminiReasoning={gameState.geminiReasoning}
            loading={loading && !gameState.isPlayerTurn && !!gameState.userSelectedChoice && !gameState.geminiSelectedChoice} // Loading only if Gemini hasn't made a choice yet
            isGeminiTurn={!gameState.isPlayerTurn && !!gameState.userSelectedChoice && !gameState.geminiSelectedChoice}
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
        
        {loading && (
           <div className="flex justify-center py-4">
             <LoadingSpinner message={loadingMessage} />
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
            {/* Removed "I'm Stuck" button as Gemini is an active participant */}
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
