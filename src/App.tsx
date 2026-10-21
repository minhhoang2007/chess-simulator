import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import { BotProfile, CapturedPieces, EvaluationState, GameSettings, MoveRecord, TimeControl } from './types/chess';
import { BOT_PROFILES, TRANSLATIONS } from './locales/i18n';
import { ChessScene } from './three/ChessScene';
import { stockfishEngine } from './engine/stockfishEngine';
import { sounds } from './audio/soundEffects';
import { EvaluationBar } from './components/EvaluationBar';
import { MoveHistory } from './components/MoveHistory';
import { CapturedPiecesView } from './components/CapturedPiecesView';
import { BotSelectorModal } from './components/BotSelectorModal';
import { PromotionModal } from './components/PromotionModal';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal } from './components/GameOverModal';
import {
  RotateCcw,
  Lightbulb,
  FlipHorizontal,
  Settings,
  Flag,
  PlusCircle,
  Eye,
  Bot,
  User,
  Timer as TimerIcon,
  Volume2,
  VolumeX,
  Sparkles
} from 'lucide-react';

export const App: React.FC = () => {
  // Game Logic
  const [chess] = useState<Chess>(() => new Chess());
  const [fen, setFen] = useState<string>(chess.fen());
  const [turn, setTurn] = useState<Color>('w');
  const [inCheck, setInCheck] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<Color | 'draw' | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string>('');
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [hintMove, setHintMove] = useState<{ from: Square; to: Square } | null>(null);

  // Settings & Configuration
  const [settings, setSettings] = useState<GameSettings>({
    language: 'vi',
    pieceTheme: 'liquid-glass',
    boardTheme: 'rustic-wood',
    soundEnabled: true,
    showCoordinates: true,
    showLegalMoves: true,
    showBestMoveHint: true,
    autoRotateOnTurn: false,
    cameraView: 'perspective'
  });

  // Bot & Match Setup
  const [selectedBot, setSelectedBot] = useState<BotProfile>(BOT_PROFILES[2]); // 1200 Elo
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [timeControl, setTimeControl] = useState<TimeControl>('unlimited');
  const [whiteTime, setWhiteTime] = useState<number>(300);
  const [blackTime, setBlackTime] = useState<number>(300);

  // Moves & Stats
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [capturedPieces, setCapturedPieces] = useState<CapturedPieces>({ w: [], b: [] });
  const [evaluation, setEvaluation] = useState<EvaluationState>({ type: 'cp', value: 0 });

  // Modals
  const [isBotModalOpen, setIsBotModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState<boolean>(false);
  const [isResignConfirmOpen, setIsResignConfirmOpen] = useState<boolean>(false);

  // 3D Scene Reference
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ChessScene | null>(null);
  const selectedSquareRef = useRef<Square | null>(null);

  const t = TRANSLATIONS[settings.language];

  // 1. Initialize 3D Scene
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const scene = new ChessScene(canvasContainerRef.current);
    sceneRef.current = scene;

    scene.setTheme(settings.pieceTheme, settings.boardTheme, settings.showCoordinates);
    scene.updateBoard(chess);

    // Click handler for 3D board
    scene.setOnSquareClick((square: Square) => {
      handleSquareClick(square);
    });

    // Realtime evaluation listener from Stockfish
    stockfishEngine.setEvaluationListener((ev) => {
      // Invert if it's black's turn to keep relative to White
      const sideMultiplier = chess.turn() === 'w' ? 1 : -1;
      setEvaluation({
        type: ev.type,
        value: ev.value * sideMultiplier
      });
    });

    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  // Update sound synthesizer state
  useEffect(() => {
    sounds.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Sync scene themes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setTheme(settings.pieceTheme, settings.boardTheme, settings.showCoordinates);
      sceneRef.current.setCameraView(settings.cameraView);
    }
  }, [settings.pieceTheme, settings.boardTheme, settings.showCoordinates, settings.cameraView]);

  // 2. Timer Countdown Effect
  useEffect(() => {
    if (timeControl === 'unlimited' || isGameOver || moveHistory.length === 0) return;

    const timer = setInterval(() => {
      if (turn === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            handleTimeLoss('w');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            handleTimeLoss('b');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [turn, isGameOver, timeControl, moveHistory.length]);

  const handleTimeLoss = (loserColor: Color) => {
    setIsGameOver(true);
    const winColor = loserColor === 'w' ? 'b' : 'w';
    setWinner(winColor);
    setGameOverReason(settings.language === 'vi' ? 'Hết thời gian thi đấu!' : 'Flagged on time!');
    setIsGameOverModalOpen(true);
    if (winColor === playerColor) {
      sounds.playVictory();
    } else {
      sounds.playDefeat();
    }
  };

  // 3. User Move Handling
  const handleSquareClick = (square: Square) => {
    if (isGameOver || isBotThinking) return;

    // Disallow moving bot's pieces
    if (chess.turn() !== playerColor) return;

    const currentSelected = selectedSquareRef.current;

    if (!currentSelected) {
      // Trying to select a piece
      const piece = chess.get(square);
      if (piece && piece.color === playerColor) {
        selectedSquareRef.current = square;
        const moves = chess.moves({ square, verbose: true });
        const legalDestinations = moves.map((m) => m.to);
        sceneRef.current?.setSelection(square, legalDestinations);
      }
      return;
    }

    // A piece is already selected
    if (currentSelected === square) {
      // Deselect
      selectedSquareRef.current = null;
      sceneRef.current?.setSelection(null, []);
      return;
    }

    // Check if clicking another friendly piece
    const targetPiece = chess.get(square);
    if (targetPiece && targetPiece.color === playerColor) {
      selectedSquareRef.current = square;
      const moves = chess.moves({ square, verbose: true });
      const legalDestinations = moves.map((m) => m.to);
      sceneRef.current?.setSelection(square, legalDestinations);
      return;
    }

    // Check if legal move
    const moves = chess.moves({ square: currentSelected, verbose: true });
    const targetMove = moves.find((m) => m.to === square);

    if (targetMove) {
      // Check if pawn promotion
      if (
        targetMove.piece === 'p' &&
        ((targetMove.color === 'w' && square[1] === '8') || (targetMove.color === 'b' && square[1] === '1'))
      ) {
        setPendingPromotion({ from: currentSelected, to: square });
        return;
      }

      executeMove(currentSelected, square);
    } else {
      // Invalid destination
      selectedSquareRef.current = null;
      sceneRef.current?.setSelection(null, []);
    }
  };

  const handlePromotionSelect = (promotedPiece: PieceSymbol) => {
    if (pendingPromotion) {
      executeMove(pendingPromotion.from, pendingPromotion.to, promotedPiece);
      setPendingPromotion(null);
    }
  };

  // 4. Execute Move on Board
  const executeMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    try {
      const moveResult = chess.move({
        from,
        to,
        promotion: promotion || 'q'
      });

      if (!moveResult) return;

      // Clear selection & hint
      selectedSquareRef.current = null;
      sceneRef.current?.setSelection(null, []);
      sceneRef.current?.setLastMove(from, to);
      sceneRef.current?.clearHint();
      setHintMove(null);

      // Play appropriate sound
      if (moveResult.captured) {
        sounds.playCapture();
      } else if (moveResult.san.includes('O-O')) {
        sounds.playCastle();
      } else if (chess.inCheck()) {
        sounds.playCheck();
      } else {
        sounds.playMove();
      }

      // Animate 3D piece
      sceneRef.current?.animateMove(from, to, () => {
        sceneRef.current?.updateBoard(chess);
      });

      // Update state
      setFen(chess.fen());
      setTurn(chess.turn());
      setInCheck(chess.inCheck());

      // Track move record
      const record: MoveRecord = {
        san: moveResult.san,
        from: moveResult.from,
        to: moveResult.to,
        color: moveResult.color,
        piece: moveResult.piece,
        captured: moveResult.captured,
        promotion: moveResult.promotion as PieceSymbol,
        fen: chess.fen()
      };
      setMoveHistory((prev) => [...prev, record]);

      // Track captured pieces
      if (moveResult.captured) {
        setCapturedPieces((prev) => {
          const key = moveResult.color === 'w' ? 'w' : 'b';
          return {
            ...prev,
            [key]: [...prev[key], moveResult.captured as PieceSymbol]
          };
        });
      }

      // Trigger background evaluation
      stockfishEngine.evaluatePosition(chess.fen());

      // Check game over
      checkGameStatus();

      // Trigger Bot turn if game continues
      if (!chess.isGameOver() && chess.turn() !== playerColor) {
        triggerBotMove();
      }
    } catch (err) {
      console.error('Move execution error:', err);
    }
  };

  // 5. Bot Move Logic
  const triggerBotMove = useCallback(() => {
    setIsBotThinking(true);

    stockfishEngine.getBestMove(chess, selectedBot, (result) => {
      setIsBotThinking(false);

      if (chess.isGameOver()) return;

      try {
        const moveResult = chess.move({
          from: result.from,
          to: result.to,
          promotion: result.promotion || 'q'
        });

        if (moveResult) {
          sceneRef.current?.setLastMove(result.from, result.to);

          if (moveResult.captured) {
            sounds.playCapture();
          } else if (moveResult.san.includes('O-O')) {
            sounds.playCastle();
          } else if (chess.inCheck()) {
            sounds.playCheck();
          } else {
            sounds.playMove();
          }

          sceneRef.current?.animateMove(result.from, result.to, () => {
            sceneRef.current?.updateBoard(chess);
          });

          setFen(chess.fen());
          setTurn(chess.turn());
          setInCheck(chess.inCheck());

          const record: MoveRecord = {
            san: moveResult.san,
            from: moveResult.from,
            to: moveResult.to,
            color: moveResult.color,
            piece: moveResult.piece,
            captured: moveResult.captured,
            promotion: moveResult.promotion as PieceSymbol,
            fen: chess.fen()
          };
          setMoveHistory((prev) => [...prev, record]);

          if (moveResult.captured) {
            setCapturedPieces((prev) => {
              const key = moveResult.color === 'w' ? 'w' : 'b';
              return {
                ...prev,
                [key]: [...prev[key], moveResult.captured as PieceSymbol]
              };
            });
          }

          stockfishEngine.evaluatePosition(chess.fen());
          checkGameStatus();
        }
      } catch (e) {
        console.error('Error executing bot move:', e);
      }
    });
  }, [chess, selectedBot, playerColor]);

  // 6. Check Game Status
  const checkGameStatus = () => {
    if (chess.isCheckmate()) {
      setIsGameOver(true);
      const winColor = chess.turn() === 'w' ? 'b' : 'w';
      setWinner(winColor);
      setGameOverReason(t.checkmate);
      setIsGameOverModalOpen(true);
      if (winColor === playerColor) {
        sounds.playVictory();
      } else {
        sounds.playDefeat();
      }
    } else if (chess.isStalemate()) {
      setIsGameOver(true);
      setWinner('draw');
      setGameOverReason(t.drawStalemate);
      setIsGameOverModalOpen(true);
    } else if (chess.isThreefoldRepetition()) {
      setIsGameOver(true);
      setWinner('draw');
      setGameOverReason(t.drawRepetition);
      setIsGameOverModalOpen(true);
    } else if (chess.isInsufficientMaterial()) {
      setIsGameOver(true);
      setWinner('draw');
      setGameOverReason(t.drawMaterial);
      setIsGameOverModalOpen(true);
    } else if (chess.isDraw()) {
      setIsGameOver(true);
      setWinner('draw');
      setGameOverReason(t.draw50Moves);
      setIsGameOverModalOpen(true);
    }
  };

  // 7. Restart / Start Game
  const startNewGame = (bot?: BotProfile, color?: Color, tc?: TimeControl) => {
    chess.reset();
    selectedSquareRef.current = null;

    const newBot = bot || selectedBot;
    const newColor = color || playerColor;
    const newTc = tc || timeControl;

    setSelectedBot(newBot);
    setPlayerColor(newColor);
    setTimeControl(newTc);

    // Reset clocks
    const initialTime = newTc === 'unlimited' ? 300 : parseInt(newTc, 10);
    setWhiteTime(initialTime);
    setBlackTime(initialTime);

    // Reset board
    sceneRef.current?.setSelection(null, []);
    sceneRef.current?.setLastMove(null, null);
    sceneRef.current?.clearHint();
    sceneRef.current?.updateBoard(chess);

    // Flip board view if player is Black
    if (sceneRef.current) {
      sceneRef.current.flipBoard(newColor === 'b');
    }

    setFen(chess.fen());
    setTurn(chess.turn());
    setInCheck(false);
    setIsGameOver(false);
    setWinner(null);
    setGameOverReason('');
    setMoveHistory([]);
    setCapturedPieces({ w: [], b: [] });
    setEvaluation({ type: 'cp', value: 0 });
    setHintMove(null);

    setIsBotModalOpen(false);
    setIsGameOverModalOpen(false);

    // If player is Black, bot plays first
    if (newColor === 'b') {
      setTimeout(() => {
        triggerBotMove();
      }, 500);
    }
  };

  // 8. Undo Move (take back 2 half-moves so it returns to player's turn)
  const handleUndo = () => {
    if (isGameOver || isBotThinking || moveHistory.length === 0) return;

    // If bot is thinking, cancel
    // Undo once if bot's turn, twice if player's turn to restore to player
    const undos = chess.turn() === playerColor ? 2 : 1;
    for (let i = 0; i < undos; i++) {
      chess.undo();
    }

    selectedSquareRef.current = null;
    sceneRef.current?.setSelection(null, []);
    sceneRef.current?.clearHint();
    sceneRef.current?.updateBoard(chess);

    setFen(chess.fen());
    setTurn(chess.turn());
    setInCheck(chess.inCheck());
    setMoveHistory((prev) => prev.slice(0, Math.max(0, prev.length - undos)));
    setHintMove(null);

    // Rebuild captured pieces
    rebuildCapturedPieces();
    stockfishEngine.evaluatePosition(chess.fen());
  };

  const rebuildCapturedPieces = () => {
    const fullWhite: PieceSymbol[] = ['p','p','p','p','p','p','p','p','r','r','n','n','b','b','q','k'];
    const fullBlack: PieceSymbol[] = ['p','p','p','p','p','p','p','p','r','r','n','n','b','b','q','k'];

    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          if (piece.color === 'w') {
            const idx = fullWhite.indexOf(piece.type);
            if (idx > -1) fullWhite.splice(idx, 1);
          } else {
            const idx = fullBlack.indexOf(piece.type);
            if (idx > -1) fullBlack.splice(idx, 1);
          }
        }
      }
    }
    // fullBlack remaining were captured by White
    setCapturedPieces({
      w: fullBlack.filter((p) => p !== 'k'),
      b: fullWhite.filter((p) => p !== 'k')
    });
  };

  // 9. Hint Feature
  const handleGetHint = () => {
    if (isGameOver || isBotThinking || chess.turn() !== playerColor) return;

    stockfishEngine.getBestMove(chess, BOT_PROFILES[5], (result) => {
      setHintMove({ from: result.from, to: result.to });
      sceneRef.current?.showHint(result.from, result.to);
    });
  };

  // 10. Flip Board
  const [isFlipped, setIsFlipped] = useState<boolean>(playerColor === 'b');
  const handleFlipBoard = () => {
    const newFlip = !isFlipped;
    setIsFlipped(newFlip);
    sceneRef.current?.flipBoard(newFlip);
  };

  // 11. Resign
  const handleResign = () => {
    setIsResignConfirmOpen(true);
  };

  const confirmResign = () => {
    setIsResignConfirmOpen(false);
    setIsGameOver(true);
    const winColor = playerColor === 'w' ? 'b' : 'w';
    setWinner(winColor);
    setGameOverReason(settings.language === 'vi' ? 'Bạn đã chấp nhận đầu hàng.' : 'Player resigned.');
    setIsGameOverModalOpen(true);
    sounds.playDefeat();
  };

  // Format clock mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-neutral-950 text-neutral-100 select-none">
      {/* Top Navigation Bar */}
      <header className="relative z-20 flex items-center justify-between px-4 py-2.5 glass-panel border-b border-white/10 bg-neutral-950/70">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-serif-luxury text-neutral-950 text-xl font-black shadow-[0_0_15px_rgba(245,158,11,0.5)]">
            ♔
          </div>
          <div>
            <h1 className="text-sm font-black font-serif-luxury tracking-wider text-white">
              {t.appTitle}
            </h1>
            <p className="text-[10px] text-amber-300 font-medium">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Center Opponent Status */}
        <div className="hidden md:flex items-center gap-3 glass-panel-subtle px-4 py-1.5 rounded-full border border-white/10">
          <div className="text-xl">{selectedBot.avatar}</div>
          <div className="text-left">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>{selectedBot.name[settings.language]}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded border border-amber-400/30">
                {selectedBot.elo} {t.elo}
              </span>
            </div>
            <div className="text-[10px] text-neutral-400">
              {isBotThinking ? (
                <span className="text-amber-300 animate-pulse flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  {t.thinking}
                </span>
              ) : inCheck ? (
                <span className="text-rose-400 font-bold">{t.check}</span>
              ) : turn === playerColor ? (
                <span className="text-emerald-400">{t.yourTurn}</span>
              ) : (
                <span className="text-neutral-400">{t.botTurn}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          {/* Language Switch */}
          <button
            onClick={() => setSettings((s) => ({ ...s, language: s.language === 'vi' ? 'en' : 'vi' }))}
            className="glass-button px-2.5 py-1.5 rounded-lg text-xs font-bold text-neutral-200 hover:text-white flex items-center gap-1.5"
            title="Đổi ngôn ngữ / Change Language"
          >
            <span>{settings.language === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
            className="glass-button p-2 rounded-lg text-neutral-300 hover:text-white"
            title={t.sound}
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
          </button>

          {/* Bot Selector */}
          <button
            onClick={() => setIsBotModalOpen(true)}
            className="glass-button px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-300 flex items-center gap-1.5 hover:bg-amber-400/20"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">{t.selectBot}</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="glass-button p-2 rounded-lg text-neutral-300 hover:text-white"
            title={t.settings}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area: 3D Viewport + Floating Chess HUD */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* 3D Canvas Container */}
        <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Top Floating Mobile Status (visible on smaller screens) */}
        <div className="md:hidden absolute top-3 left-3 right-3 z-10 flex items-center justify-between glass-panel p-2 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span>{selectedBot.avatar}</span>
            <span className="font-bold">{selectedBot.name[settings.language]}</span>
            <span className="font-mono text-[10px] text-amber-300">{selectedBot.elo} Elo</span>
          </div>
          <div>
            {isBotThinking ? (
              <span className="text-amber-400 animate-pulse">{t.thinking}</span>
            ) : inCheck ? (
              <span className="text-rose-400 font-bold">{t.check}</span>
            ) : (
              <span className={turn === playerColor ? 'text-emerald-400' : 'text-neutral-400'}>
                {turn === playerColor ? t.yourTurn : t.botTurn}
              </span>
            )}
          </div>
        </div>

        {/* Left Floating Controls Bar (matches user reference image layout!) */}
        <div className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-3">
          {/* Evaluation Bar */}
          <EvaluationBar evaluation={evaluation} language={settings.language} />
        </div>

        {/* Right Floating Quick Tools Bar (Undo, Flip, Hint, Camera, Resign) */}
        <div className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2.5">
          {/* Flip Board */}
          <button
            onClick={handleFlipBoard}
            className="glass-button p-3 rounded-2xl shadow-xl flex items-center justify-center group"
            title={t.flipBoard}
          >
            <FlipHorizontal className="w-5 h-5 text-neutral-300 group-hover:text-amber-300 transition-colors" />
          </button>

          {/* Undo Move */}
          <button
            onClick={handleUndo}
            disabled={moveHistory.length === 0 || isBotThinking || isGameOver}
            className="glass-button p-3 rounded-2xl shadow-xl flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none group"
            title={t.undo}
          >
            <RotateCcw className="w-5 h-5 text-neutral-300 group-hover:text-amber-300 transition-colors" />
          </button>

          {/* Hint */}
          <button
            onClick={handleGetHint}
            disabled={isBotThinking || isGameOver || turn !== playerColor}
            className="glass-button p-3 rounded-2xl shadow-xl flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none group relative"
            title={t.hint}
          >
            <Lightbulb className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
          </button>

          {/* Camera View Switcher */}
          <button
            onClick={() => {
              const presets: ('perspective' | 'topdown' | 'white' | 'black')[] = ['perspective', 'topdown', 'white', 'black'];
              const curIdx = presets.indexOf(settings.cameraView);
              const nextPreset = presets[(curIdx + 1) % presets.length];
              setSettings((s) => ({ ...s, cameraView: nextPreset }));
            }}
            className="glass-button p-3 rounded-2xl shadow-xl flex items-center justify-center group"
            title={t.cameraPresets}
          >
            <Eye className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
          </button>

          {/* Resign Button */}
          <button
            onClick={handleResign}
            disabled={isGameOver || moveHistory.length === 0}
            className="glass-button p-3 rounded-2xl shadow-xl flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none group"
            title={t.resign}
          >
            <Flag className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" />
          </button>

          {/* New Game */}
          <button
            onClick={() => setIsBotModalOpen(true)}
            className="glass-button p-3 rounded-2xl shadow-xl flex items-center justify-center group bg-amber-400/20 border-amber-400/40"
            title={t.newGame}
          >
            <PlusCircle className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Bottom Floating Info Dock: Players, Captured Pieces, Clocks & Notation */}
        <div className="absolute bottom-3 left-3 right-3 md:left-16 md:right-16 z-10 flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3 pointer-events-none">
          {/* Left Player Info Box (Player & Bot cards) */}
          <div className="pointer-events-auto flex flex-col gap-2">
            {/* Opponent (Bot) Card */}
            <div className="glass-panel px-3 py-2 rounded-xl flex items-center gap-3 border border-white/10 max-w-xs shadow-lg">
              <div className="text-2xl">{selectedBot.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-neutral-200 truncate">
                  {selectedBot.name[settings.language]}
                </div>
                <CapturedPiecesView
                  captured={capturedPieces}
                  color={playerColor === 'w' ? 'b' : 'w'}
                />
              </div>
              {timeControl !== 'unlimited' && (
                <div className="font-mono text-sm font-bold px-2 py-1 rounded bg-black/40 border border-white/10 text-neutral-300 flex items-center gap-1">
                  <TimerIcon className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{formatTime(playerColor === 'w' ? blackTime : whiteTime)}</span>
                </div>
              )}
            </div>

            {/* User Player Card */}
            <div className="glass-panel px-3 py-2 rounded-xl flex items-center gap-3 border border-white/10 max-w-xs shadow-lg">
              <div className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-amber-200 truncate">
                  {playerColor === 'w' ? t.whitePlayer : t.blackPlayer}
                </div>
                <CapturedPiecesView
                  captured={capturedPieces}
                  color={playerColor}
                />
              </div>
              {timeControl !== 'unlimited' && (
                <div className="font-mono text-sm font-bold px-2 py-1 rounded bg-black/40 border border-white/10 text-amber-300 flex items-center gap-1">
                  <TimerIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>{formatTime(playerColor === 'w' ? whiteTime : blackTime)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Hint Banner if active */}
          {hintMove && (
            <div className="pointer-events-auto self-center glass-panel px-4 py-2 rounded-xl border border-sky-400/40 text-xs font-semibold text-sky-200 shadow-xl flex items-center gap-2 animate-bounce">
              <Sparkles className="w-4 h-4 text-sky-300" />
              <span>
                {t.hintText.replace('{from}', hintMove.from.toUpperCase()).replace('{to}', hintMove.to.toUpperCase())}
              </span>
            </div>
          )}

          {/* Right Move History Card (collapsible / compact) */}
          <div className="pointer-events-auto w-full md:w-64 h-32 md:h-40 shadow-xl">
            <MoveHistory history={moveHistory} language={settings.language} />
          </div>
        </div>
      </div>

      {/* MODALS */}
      {/* Bot Selector Modal */}
      <BotSelectorModal
        isOpen={isBotModalOpen}
        selectedBot={selectedBot}
        selectedColor={playerColor}
        timeControl={timeControl}
        language={settings.language}
        onSelectBot={setSelectedBot}
        onSelectColor={setPlayerColor}
        onSelectTimeControl={setTimeControl}
        onStartGame={() => startNewGame(selectedBot, playerColor, timeControl)}
        onClose={() => setIsBotModalOpen(false)}
      />

      {/* Pawn Promotion Modal */}
      <PromotionModal
        isOpen={pendingPromotion !== null}
        color={playerColor}
        language={settings.language}
        onSelectPiece={handlePromotionSelect}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onUpdateSettings={(newVals) => setSettings((prev) => ({ ...prev, ...newVals }))}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={isGameOverModalOpen}
        winner={winner}
        reason={gameOverReason}
        playerColor={playerColor}
        bot={selectedBot}
        language={settings.language}
        onRematch={() => startNewGame()}
        onChangeBot={() => {
          setIsGameOverModalOpen(false);
          setIsBotModalOpen(true);
        }}
      />

      {/* Resign Confirmation Dialog */}
      {isResignConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm glass-panel rounded-2xl border border-white/20 p-5 shadow-2xl text-center">
            <h4 className="text-base font-bold text-white mb-2">{t.resignConfirmTitle}</h4>
            <p className="text-xs text-neutral-300 mb-5">{t.resignConfirmMsg}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsResignConfirmOpen(false)}
                className="flex-1 py-2 rounded-xl bg-white/10 text-xs font-semibold hover:bg-white/15 transition-colors"
              >
                {t.confirmCancel}
              </button>
              <button
                onClick={confirmResign}
                className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white shadow-lg transition-colors"
              >
                {t.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
