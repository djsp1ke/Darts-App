import { useState, useCallback, useMemo } from 'react';
import { DartsScoringEngine, type PlayerState } from './scoring/scoringEngine';
import {
  Button,
  ScoreDisplay,
  Keypad,
  InputDisplay,
  MatchStats,
  Modal,
  CheckoutSuggestion
} from './components/ScorerComponents';
import type { MatchConfig } from './types';

// ==================== TYPES ====================

type GameScreen = 'setup' | 'game' | 'result';

interface GameSetup {
  player1Name: string;
  player2Name: string;
  startingScore: 501 | 301 | 170 | 121;
  matchType: 'first_to' | 'best_of';
  targetLegs: number;
}

// ==================== CONSTANTS ====================

const STARTING_SCORE_OPTIONS = [501, 301, 170, 121] as const;
const LEGS_OPTIONS = [1, 3, 5, 7, 9, 11] as const;

// ==================== MAIN APP ====================

export default function App() {
  // Screen state
  const [screen, setScreen] = useState<GameScreen>('setup');

  // Setup state
  const [setup, setSetup] = useState<GameSetup>({
    player1Name: 'Player 1',
    player2Name: 'Player 2',
    startingScore: 501,
    matchType: 'first_to',
    targetLegs: 3
  });

  // Game state
  const [engine, setEngine] = useState<DartsScoringEngine | null>(null);
  const [player1, setPlayer1] = useState<PlayerState | null>(null);
  const [player2, setPlayer2] = useState<PlayerState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [inputValue, setInputValue] = useState('');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  // ==================== HANDLERS ====================

  const handleStartGame = useCallback(() => {
    const config: MatchConfig = {
      startingScore: setup.startingScore,
      matchType: setup.matchType,
      targetLegs: setup.targetLegs,
      doubleOut: true
    };

    const newEngine = new DartsScoringEngine(config);
    const p1 = newEngine.createPlayerState(setup.player1Name);
    const p2 = newEngine.createPlayerState(setup.player2Name);

    setEngine(newEngine);
    setPlayer1(p1);
    setPlayer2(p2);
    setCurrentPlayer(1);
    setInputValue('');
    setWinner(null);
    setScreen('game');
  }, [setup]);

  const handleNumberClick = useCallback((num: number) => {
    setInputValue(prev => {
      const newValue = prev + num.toString();
      // Limit to 3 digits (max score 180)
      if (newValue.length > 3) return prev;
      return newValue;
    });
  }, []);

  const handleClear = useCallback(() => {
    setInputValue('');
  }, []);

  const handleUndo = useCallback(() => {
    setInputValue(prev => prev.slice(0, -1));
  }, []);

  const handleEnter = useCallback(() => {
    if (!engine || !player1 || !player2 || !inputValue) return;

    const score = parseInt(inputValue, 10);
    if (isNaN(score)) {
      setInputValue('');
      return;
    }

    const currentPlayerState = currentPlayer === 1 ? player1 : player2;
    const setCurrentPlayerState = currentPlayer === 1 ? setPlayer1 : setPlayer2;
    const otherPlayerState = currentPlayer === 1 ? player2 : player1;
    const setOtherPlayerState = currentPlayer === 1 ? setPlayer2 : setPlayer1;

    const { player: updatedPlayer, result } = engine.applyThrow(currentPlayerState, score);
    setCurrentPlayerState(updatedPlayer);

    if (result.isMatchWon) {
      setWinner(updatedPlayer.name);
      setScreen('result');
    } else if (result.isLegWon) {
      // Reset both players for new leg
      setCurrentPlayerState(engine.resetForNewLeg(updatedPlayer));
      setOtherPlayerState(engine.resetForNewLeg(otherPlayerState));
      // Switch starting player (the one who lost starts)
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    } else if (!result.isBust) {
      // Normal throw - switch players
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
    // On bust, same player throws again (score resets to start of turn)

    setInputValue('');
  }, [engine, player1, player2, currentPlayer, inputValue]);

  const handleNewGame = useCallback(() => {
    setScreen('setup');
    setEngine(null);
    setPlayer1(null);
    setPlayer2(null);
    setWinner(null);
  }, []);

  const handleRematch = useCallback(() => {
    if (!engine || !player1 || !player2) return;

    setPlayer1(engine.resetForNewMatch(player1));
    setPlayer2(engine.resetForNewMatch(player2));
    setCurrentPlayer(1);
    setInputValue('');
    setWinner(null);
    setScreen('game');
  }, [engine, player1, player2]);

  // ==================== COMPUTED VALUES ====================

  const currentPlayerState = useMemo(() =>
    currentPlayer === 1 ? player1 : player2,
    [currentPlayer, player1, player2]
  );

  // ==================== RENDER ====================

  if (screen === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-2xl">
          <h1 className="text-3xl font-black text-center mb-8 bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">
            Darts Scorer
          </h1>

          <div className="space-y-6">
            {/* Player Names */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Player 1</label>
                <input
                  type="text"
                  value={setup.player1Name}
                  onChange={(e) => setSetup(s => ({ ...s, player1Name: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-gold-500 focus:outline-none transition-colors"
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Player 2</label>
                <input
                  type="text"
                  value={setup.player2Name}
                  onChange={(e) => setSetup(s => ({ ...s, player2Name: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-gold-500 focus:outline-none transition-colors"
                  placeholder="Enter name"
                />
              </div>
            </div>

            {/* Starting Score */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Game Type</label>
              <div className="grid grid-cols-4 gap-2">
                {STARTING_SCORE_OPTIONS.map(score => (
                  <button
                    key={score}
                    onClick={() => setSetup(s => ({ ...s, startingScore: score }))}
                    className={`py-3 rounded-lg font-bold transition-all ${
                      setup.startingScore === score
                        ? 'bg-gold-500 text-black'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            {/* Match Type */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Match Format</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSetup(s => ({ ...s, matchType: 'first_to' }))}
                  className={`py-3 rounded-lg font-bold transition-all ${
                    setup.matchType === 'first_to'
                      ? 'bg-gold-500 text-black'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  First to
                </button>
                <button
                  onClick={() => setSetup(s => ({ ...s, matchType: 'best_of' }))}
                  className={`py-3 rounded-lg font-bold transition-all ${
                    setup.matchType === 'best_of'
                      ? 'bg-gold-500 text-black'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Best of
                </button>
              </div>
            </div>

            {/* Target Legs */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Legs</label>
              <div className="grid grid-cols-6 gap-2">
                {LEGS_OPTIONS.map(legs => (
                  <button
                    key={legs}
                    onClick={() => setSetup(s => ({ ...s, targetLegs: legs }))}
                    className={`py-3 rounded-lg font-bold transition-all ${
                      setup.targetLegs === legs
                        ? 'bg-gold-500 text-black'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {legs}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <Button
              onClick={handleStartGame}
              size="lg"
              fullWidth
              className="mt-4"
            >
              Start Game
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'result' && player1 && player2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-2xl text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-3xl font-black mb-2 text-gold-500">
            {winner} Wins!
          </h1>
          <p className="text-slate-400 mb-8">
            {player1.legs} - {player2.legs}
          </p>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="text-left">
              <h3 className="font-bold text-slate-300 mb-3">{player1.name}</h3>
              <MatchStats stats={player1.stats} compact />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-300 mb-3">{player2.name}</h3>
              <MatchStats stats={player2.stats} compact />
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleRematch} variant="secondary" fullWidth>
              Rematch
            </Button>
            <Button onClick={handleNewGame} fullWidth>
              New Game
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Game screen
  if (!engine || !player1 || !player2) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <button
          onClick={handleNewGame}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <div className="text-center">
          <div className="text-xs text-slate-500 uppercase tracking-wider">
            {setup.matchType === 'first_to' ? 'First to' : 'Best of'} {setup.targetLegs}
          </div>
          <div className="font-bold text-gold-500">{setup.startingScore}</div>
        </div>
        <button
          onClick={() => setShowStatsModal(true)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/>
            <path d="m19 9-5 5-4-4-3 3"/>
          </svg>
        </button>
      </header>

      {/* Score Displays */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <ScoreDisplay
          score={player1.score}
          playerName={player1.name}
          legs={player1.legs}
          average={player1.stats.average}
          isActive={currentPlayer === 1}
          history={player1.matchHistory}
          showHistory={false}
        />
        <ScoreDisplay
          score={player2.score}
          playerName={player2.name}
          legs={player2.legs}
          average={player2.stats.average}
          isActive={currentPlayer === 2}
          history={player2.matchHistory}
          showHistory={false}
        />
      </div>

      {/* Checkout Suggestion */}
      {currentPlayerState && currentPlayerState.score <= 170 && (
        <div className="px-4">
          <CheckoutSuggestion remaining={currentPlayerState.score} />
        </div>
      )}

      {/* Input & Keypad */}
      <div className="flex-1 flex flex-col justify-end p-4 gap-4">
        <InputDisplay
          value={inputValue}
          onClear={handleClear}
        />
        <Keypad
          onNumberClick={handleNumberClick}
          onEnter={handleEnter}
          onUndo={handleUndo}
          onClear={handleClear}
          showQuickScores
        />
      </div>

      {/* Stats Modal */}
      <Modal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        title="Match Statistics"
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-slate-300 mb-3">{player1.name}</h3>
            <MatchStats stats={player1.stats} />
          </div>
          <div className="border-t border-slate-700 pt-6">
            <h3 className="font-bold text-slate-300 mb-3">{player2.name}</h3>
            <MatchStats stats={player2.stats} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
