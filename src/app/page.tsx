
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { InventoryDisplay } from '@/components/game/InventoryDisplay';
import { JumpscareOverlay } from '@/components/effects/JumpscareOverlay';
import { AlertCircle, RotateCcw, SaveIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const MAX_HEALTH = 2;
const MAX_STAMINA = 3;
const SAVE_GAME_KEY = 'dualDreadSaveData_v4';

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
  playerStamina: number;
  geminiStamina: number;
  inventory: string[];
}

const FIXED_STARTING_SCENE = "You find yourselves standing before an old, weathered wooden fence gate. Beyond it, a barely visible path disappears into the dark, foreboding woods. It's the middle of the night, the air is cold, and you realize you are utterly lost.";

const initialGameState: GameState = {
  narration: "",
  sceneDescription: FIXED_STARTING_SCENE,
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
  playerStamina: MAX_STAMINA,
  geminiStamina: MAX_STAMINA,
  inventory: [],
};

const STATIC_CHOICES_POOL = [
  "Cautiously investigate the immediate surroundings.",
  "Try to find a way out of this area.",
  "Communicate with your companion about the situation.",
  "Listen carefully for any sounds or clues.",
  "Search for any useful items nearby.",
  "Examine the most unsettling feature of the room/area.",
  "Check for escape routes or hidden paths.",
  "Prepare a defensive position or look for shelter.",
  "Call out to see if anyone else is there (risky).",
  "Attempt to use an item from your inventory (if applicable).",
  "Focus on deciphering any strange symbols or writings.",
  "Try to remember how you got here."
];


const PREDEFINED_INITIAL_FLAVORS: Array<{
  initialChallenge: string;
  firstNarration: string;
  initialUserChoice: string;
  initialGeminiChoice: string;
}> = [
  {
    initialChallenge: "The gate is slightly ajar. Decide whether to push through into the oppressive darkness of the woods or examine the gate and its surroundings more closely.",
    firstNarration: "A gust of wind rustles the leaves in the unseen canopy above, sounding like hushed whispers. The fence gate groans softly. The path beyond is an inky void.",
    initialUserChoice: "Let's check the gate first, see if there are any markings or clues around it.",
    initialGeminiChoice: "My sensors detect faint, unidentifiable organic traces near the path. Proceeding into the woods seems ill-advised without more information."
  },
  {
    initialChallenge: "An unnatural silence hangs in the air, broken only by your own breathing. The woods feel ancient and menacing. What's your first move: try to follow the path, or scout the treeline near the gate?",
    firstNarration: "The moonlight barely pierces the dense foliage, casting long, dancing shadows that play tricks on your eyes. Every snap of a twig underfoot could be a sign of danger.",
    initialUserChoice: "I'll scout along the treeline near the gate. Maybe there's something less obvious than the main path.",
    initialGeminiChoice: "I will scan the visible portion of the path for immediate hazards. Caution is paramount."
  },
  {
    initialChallenge: "A barely audible, rhythmic thumping emanates from deep within the woods. Do you investigate the sound, or try to find a different direction away from it?",
    firstNarration: "The old wooden fence seems to mark a boundary between the known and the deeply unknown. The thumping sound is unsettlingly organic, like a giant heartbeat.",
    initialUserChoice: "That thumping is unnerving. Let's try to move away from it, perhaps find a different way around this fence.",
    initialGeminiChoice: "The sound's frequency is too low for most known fauna. Analyzing its origin could be crucial, but also dangerous."
  }
];


function getDynamicChoices(sceneDescription: string, challenge: string, turnCount: number): string[] {
  const uniqueChoices = new Set<string>();
  const basePool = [...STATIC_CHOICES_POOL];
  for (let i = basePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [basePool[i], basePool[j]] = [basePool[j], basePool[i]];
  }

  while(uniqueChoices.size < 3 && basePool.length > 0) {
    const choiceIndex = Math.floor(Math.random() * basePool.length);
    uniqueChoices.add(basePool.splice(choiceIndex, 1)[0]);
  }
  // Ensure 3 choices by falling back to the start of the static pool if needed
  if (uniqueChoices.size < 3) {
    const needed = 3 - uniqueChoices.size;
    STATIC_CHOICES_POOL.slice(0, needed).forEach(c => uniqueChoices.add(c));
  }

  return Array.from(uniqueChoices);
}


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
  const [jumpscareActive, setJumpscareActive] = useState(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  const prevPlayerHealthRef = useRef<number>(gameState.playerHealth);
  const prevGeminiHealthRef = useRef<number>(gameState.geminiHealth);

  useEffect(() => {
    prevPlayerHealthRef.current = gameState.playerHealth;
    prevGeminiHealthRef.current = gameState.geminiHealth;
  }, [gameState.playerHealth, gameState.geminiHealth]);


  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(SAVE_GAME_KEY)) {
      setSaveFileExists(true);
    }
  }, []);


  const handleError = useCallback((error: any, message: string) => {
    console.error(message, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    setGameState(prev => ({ ...prev, errorMessage: `${message}: ${errorMessage.slice(0, 200)}`, isPlayerTurn: true }));
    toast({
      title: "An Error Occurred",
      description: `${message.slice(0,100)}. Please try again.`,
      variant: "destructive",
    });
    setLoading(false);
    setImageLoading(false);
  }, [toast]);

  const speakNarration = useCallback((text: string, turnCount: number) => {
    if (typeof window !== 'undefined' && window.speechSynthesis && text) {
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      if (turnCount >= 15) {
        utterance.pitch = 0.3;
        utterance.rate = 0.6;
      } else if (turnCount >= 10) {
        utterance.pitch = 0.6;
        utterance.rate = 0.8;
      } else if (turnCount >= 5) {
        utterance.pitch = 0.9;
        utterance.rate = 0.9;
      } else {
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
      }

      speechSynthesis.speak(utterance);
    }
  }, []);

  useEffect(() => {
    if (gameState.narration && gameStarted && !loading && !gameState.gameOver) {
      speakNarration(gameState.narration, gameState.turnCount);
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        speechSynthesis.cancel();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.narration, gameState.turnCount, gameStarted, loading, gameState.gameOver]);


  const handleGenerateSceneImage = useCallback(async (currentSceneDescription: string, currentTurnCount: number) => {
    if (!currentSceneDescription) return;
    setImageLoading(true);
    setImageError(null);
    try {
      const imageInput: GenerateSceneImageInput = {
        sceneDescription: currentSceneDescription,
        turnCount: currentTurnCount
      };
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

  const triggerJumpscare = () => {
    setJumpscareActive(true);
    if (mainContainerRef.current) {
      mainContainerRef.current.classList.add('shake');
    }
    setTimeout(() => {
      setJumpscareActive(false);
      if (mainContainerRef.current) {
        mainContainerRef.current.classList.remove('shake');
      }
    }, 300);
  };


  const initializeNewGame = useCallback(async () => {
    setLoading(true);
    setLoadingMessage("The familiar dread washes over you...");
    setGameState(initialGameState);
    setSceneImageUrl(null);
    setImageError(null);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      speechSynthesis.cancel();
    }

    const randomFlavor = PREDEFINED_INITIAL_FLAVORS[Math.floor(Math.random() * PREDEFINED_INITIAL_FLAVORS.length)];

    try {
      const initialNarrationInput: NarrateAdventureInput = {
        userChoice: randomFlavor.initialUserChoice,
        geminiChoice: randomFlavor.initialGeminiChoice,
        currentSceneDescription: FIXED_STARTING_SCENE,
        playerHealth: MAX_HEALTH,
        geminiHealth: MAX_HEALTH,
        playerStamina: MAX_STAMINA,
        geminiStamina: MAX_STAMINA,
        turnCount: 1,
        currentInventory: [],
      };
      const response = await narrateAdventure(initialNarrationInput);

      const newGameState: GameState = {
        ...initialGameState,
        narration: response.narration || randomFlavor.firstNarration,
        sceneDescription: response.sceneDescription || FIXED_STARTING_SCENE,
        challenge: response.challenge || randomFlavor.initialChallenge,
        availableChoices: getDynamicChoices(response.sceneDescription || FIXED_STARTING_SCENE, response.challenge || randomFlavor.initialChallenge, 1),
        playerHealth: response.updatedPlayerHealth,
        geminiHealth: response.updatedGeminiHealth,
        playerStamina: response.updatedPlayerStamina,
        geminiStamina: response.updatedGeminiStamina,
        isPlayerTurn: !response.isGameOver,
        gameOver: response.isGameOver,
        turnCount: 1,
        inventory: response.newItemFound ? [response.newItemFound] : [],
      };
      setGameState(newGameState);
      prevPlayerHealthRef.current = response.updatedPlayerHealth;
      prevGeminiHealthRef.current = response.updatedGeminiHealth;


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
        sceneDescription: FIXED_STARTING_SCENE,
        narration: randomFlavor.firstNarration,
        challenge: randomFlavor.initialChallenge,
        availableChoices: getDynamicChoices(FIXED_STARTING_SCENE, randomFlavor.initialChallenge, 0),
        isPlayerTurn: true,
        turnCount: 1,
      }));
    } finally {
      setLoading(false);
    }
  }, [handleError, toast]);


  useEffect(() => {
    if (gameStarted && gameState.sceneDescription && !gameState.gameOver && !loading) {
      handleGenerateSceneImage(gameState.sceneDescription, gameState.turnCount);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.sceneDescription, gameState.turnCount, gameState.gameOver, gameStarted]);


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
    if (gameState.gameOver && gameState.turnCount > 0) {
      toast({ title: "Cannot Save", description: "The story has concluded. There is nothing left to save.", variant: "destructive" });
      return;
    }
    if (gameState.turnCount === 0 && !gameState.narration) {
      toast({ title: "Cannot Save", description: "The adventure has not truly begun. Make your first move.", variant: "default" });
      return;
    }
    try {
      const saveData = {
        gameState,
        sceneImageUrl,
      };
      localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(saveData));
      setSaveFileExists(true);
      toast({ title: "Progress Saved", description: "Your descent into dread has been chronicled..." });
    } catch (error) {
      handleError(error, "Failed to save game. Your progress may be lost to the void.");
    }
  };

  const loadGame = () => {
    setLoading(true);
    setLoadingMessage("Reliving past terrors...");
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      speechSynthesis.cancel();
    }
    try {
      const savedDataString = localStorage.getItem(SAVE_GAME_KEY);
      if (savedDataString) {
        const savedData = JSON.parse(savedDataString);

        const loadedGameState: GameState = {
          ...initialGameState,
          ...savedData.gameState,
          playerHealth: savedData.gameState.playerHealth !== undefined ? savedData.gameState.playerHealth : MAX_HEALTH,
          geminiHealth: savedData.gameState.geminiHealth !== undefined ? savedData.gameState.geminiHealth : MAX_HEALTH,
          playerStamina: savedData.gameState.playerStamina !== undefined ? savedData.gameState.playerStamina : MAX_STAMINA,
          geminiStamina: savedData.gameState.geminiStamina !== undefined ? savedData.gameState.geminiStamina : MAX_STAMINA,
          inventory: savedData.gameState.inventory || [],
        };

        setGameState(loadedGameState);
        prevPlayerHealthRef.current = loadedGameState.playerHealth;
        prevGeminiHealthRef.current = loadedGameState.geminiHealth;

        setSceneImageUrl(savedData.sceneImageUrl || null);
        setGameStarted(true);
        setImageError(null);
        setImageLoading(false);
        toast({ title: "Game Loaded", description: "The nightmare resumes..." });

        if (!loadedGameState.gameOver && loadedGameState.availableChoices.length === 0 && loadedGameState.turnCount > 0) {
             setGameState(prev => ({
                ...prev,
                availableChoices: getDynamicChoices(prev.sceneDescription, prev.challenge, prev.turnCount)
            }));
        }
      } else {
        toast({ title: "Load Failed", description: "No prior dread found. A fresh nightmare awaits.", variant: "destructive" });
        setGameStarted(false); // Ensure we go back to start menu if load fails
      }
    } catch (error) {
      handleError(error, "Failed to load game. The save data may be corrupted.");
      setGameStarted(false);
    } finally {
      setLoading(false);
    }
  };


  const handlePlayerChoice = async (playerChoice: string) => {
    if (gameState.gameOver || !gameState.isPlayerTurn) return;

    setLoading(true);
    setLoadingMessage("Gemini sinks into the shadows, contemplating...");
    setGameState(prev => ({
      ...prev,
      userSelectedChoice: playerChoice,
      isPlayerTurn: false,
      errorMessage: null,
      geminiSelectedChoice: null,
      geminiReasoning: null,
    }));
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      speechSynthesis.cancel();
    }

    try {
      // Gemini's Turn
      const interpretInput: InterpretChoicesInput = {
        sceneDescription: gameState.sceneDescription,
        availableChoices: gameState.availableChoices,
        currentGeminiHealth: gameState.geminiHealth,
        currentGeminiStamina: gameState.geminiStamina,
      };
      const geminiResponse = await interpretChoices(interpretInput);

      setLoadingMessage("The tendrils of fate warp and twist...");
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
        playerStamina: gameState.playerStamina,
        geminiStamina: gameState.geminiStamina,
        turnCount: gameState.turnCount + 1,
        currentInventory: gameState.inventory,
      };
      const narrationResponse = await narrateAdventure(narrateInput);

      let updatedInventory = [...gameState.inventory];
      if (narrationResponse.newItemFound) {
        if (!updatedInventory.includes(narrationResponse.newItemFound)) {
          updatedInventory.push(narrationResponse.newItemFound);
        }
      }
      if (narrationResponse.itemUsed) {
        updatedInventory = updatedInventory.filter(item => item !== narrationResponse.itemUsed);
      }

      const playerLostHealthThisTurnByLLM = narrationResponse.playerLostHealthThisTurn === true;
      const geminiLostHealthThisTurnByLLM = narrationResponse.geminiLostHealthThisTurn === true;


      setGameState(prev => ({
        ...prev,
        narration: narrationResponse.narration,
        sceneDescription: narrationResponse.sceneDescription,
        challenge: narrationResponse.challenge,
        playerHealth: narrationResponse.updatedPlayerHealth,
        geminiHealth: narrationResponse.updatedGeminiHealth,
        playerStamina: narrationResponse.updatedPlayerStamina,
        geminiStamina: narrationResponse.updatedGeminiStamina,
        inventory: updatedInventory,
        availableChoices: narrationResponse.isGameOver ? [] : getDynamicChoices(narrationResponse.sceneDescription, narrationResponse.challenge, prev.turnCount + 1),
        isPlayerTurn: !narrationResponse.isGameOver,
        gameOver: narrationResponse.isGameOver,
        turnCount: prev.turnCount + 1,
      }));

      if ((playerLostHealthThisTurnByLLM || geminiLostHealthThisTurnByLLM) && !narrationResponse.isGameOver && gameStarted) {
         triggerJumpscare();
      }


      if (narrationResponse.isGameOver) {
        toast({
          title: narrationResponse.updatedPlayerHealth <= 0 && narrationResponse.updatedGeminiHealth <= 0 ? "TOTAL PARTY KILL"
               : narrationResponse.updatedPlayerHealth <= 0 ? "YOUR SOUL IS LOST"
               : "GEMINI IS NO MORE",
          description: narrationResponse.narration || "The darkness has claimed its due. Silence falls.",
          variant: "destructive",
          duration: 15000,
        });
      }

    } catch (error) {
      handleError(error, "Failed to process turn. The narrative unravels.");
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
    setGameStarted(true);
    initializeNewGame();
  };


  if (!gameStarted) {
    return <StartMenu onStartGame={handleStartNewGame} onOpenSettings={handleOpenSettings} onLoadGame={loadGame} saveFileExists={saveFileExists} />;
  }

  return (
    <div ref={mainContainerRef} className="min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 md:p-8 bg-gradient-to-br from-background to-secondary/70 relative">
      <JumpscareOverlay active={jumpscareActive} />
      <header className="w-full max-w-3xl mb-6 text-center pt-8">
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
          <div className="bg-destructive/30 border border-destructive text-destructive-foreground p-4 rounded-lg shadow-lg flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 shrink-0" />
            <div>
                <h3 className="font-semibold">A Shadow Falls Upon Us...</h3>
                <p className="text-sm">{gameState.errorMessage}</p>
            </div>
          </div>
        )}

        <PlayerHealthDisplay
          playerName="You"
          playerHealth={gameState.playerHealth}
          playerStamina={gameState.playerStamina}
          geminiName="Gemini"
          geminiHealth={gameState.geminiHealth}
          geminiStamina={gameState.geminiStamina}
          maxHealth={MAX_HEALTH}
          maxStamina={MAX_STAMINA}
        />

        <SceneVisualization
          imageUrl={sceneImageUrl}
          isLoading={imageLoading}
          error={imageError}
          sceneDescription={gameState.sceneDescription}
        />

        <InventoryDisplay items={gameState.inventory} />

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
            loading={loading && !gameState.isPlayerTurn && !!gameState.userSelectedChoice && !gameState.geminiSelectedChoice}
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
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center p-6 bg-card/90 backdrop-blur-md rounded-lg shadow-xl border border-destructive/50"
          >
            <h2 className="font-horror text-5xl text-destructive mb-4 animate-pulse">THE END?</h2>
            <p className="text-muted-foreground mb-6 text-lg">{gameState.narration || "The darkness consumes all. Silence reigns."}</p>
            <Button onClick={handleRestartGame} variant="destructive" size="lg" className="font-horror text-xl py-3 px-6 group">
              <RotateCcw className="mr-2 h-6 w-6 transition-transform group-hover:rotate-[-90deg]" /> Face the Dread Anew
            </Button>
          </motion.div>
        )}

        {!gameState.gameOver && (
          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4 pb-8">
            <Button onClick={saveGame} variant="outline" className="font-semibold border-primary/70 hover:bg-primary/10 hover:text-primary-foreground text-base py-3 px-5">
              <SaveIcon className="mr-2 h-5 w-5" /> Chronicle Your Sanity
            </Button>
            <Button onClick={handleRestartGame} variant="outline" className="font-semibold border-accent/70 hover:bg-accent/10 hover:text-accent-foreground text-base py-3 px-5">
              <RotateCcw className="mr-2 h-5 w-5" /> Flee This Nightmare (Restart)
            </Button>
          </div>
        )}
      </main>

      <footer className="w-full max-w-3xl mt-12 pb-8 text-center">
        <p className="text-sm text-muted-foreground/70">
          Dual Dread &copy; {new Date().getFullYear()}. The shadows are always watching.
        </p>
      </footer>
    </div>
  );
}

    