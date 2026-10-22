import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import confetti from 'canvas-confetti';
import { BotProfile, CapturedPieces, GameSettings, MoveRecord, TimeControl } from './types/chess';
import { CHESS_COM_BOTS, TRANSLATIONS } from './locales/i18n';
import { ChessScene } from './three/ChessScene';
import { stockfishEngine } from './engine/stockfishEngine';
import { sounds } from './audio/soundEffects';
import { BotSelectorModal } from './components/BotSelectorModal';
import { GameOverModal } from './components/GameOverModal';
import { PromotionModal } from './components/PromotionModal';
import { MenuDrawer } from './components/MenuDrawer';
import { AryaCompanion, AryaState } from './components/AryaCompanion';
import { Menu, RotateCcw, Users, ZoomIn, ZoomOut, Trophy } from 'lucide-react';

export const App: React.FC = () => {
  // Core Chess State
  const [chess] = useState<Chess>(() => new Chess());
  const [turn, setTurn] = useState<Color>('w');
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<Color | 'draw' | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string>('');
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [hintInfo, setHintInfo] = useState<{ from: Square; to: Square } | null>(null);

  // Checkmated King Square & 2D Screen Position for Chess.com Checkmate Popup
  const [matedKingSquare, setMatedKingSquare] = useState<Square | null>(null);
  const [matedKingScreenPos, setMatedKingScreenPos] = useState<{ x: number; y: number } | null>(null);
  const matedKingSquareRef = useRef<Square | null>(null);

  // Settings: Default Board Blue ('tournament-blue') + Classic Wood ('classic-wood')
  const [settings, setSettings] = useState<GameSettings>({
    language: 'en',
    pieceTheme: 'classic-wood',
    boardTheme: 'tournament-blue',
    soundEnabled: true,
    showCoordinates: true,
    showLegalMoves: true,
    showEvaluationBar: false,
    cameraTilt: 'photo'
  });

  // Current Bot: Defaults to Arya (1500) or Jimmy (600); Bot Selector opens immediately on launch
  const [selectedBot, setSelectedBot] = useState<BotProfile>(CHESS_COM_BOTS[0]);
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [timeControl, setTimeControl] = useState<TimeControl>('unlimited');
  const [whiteTime, setWhiteTime] = useState<number>(300);
  const [blackTime, setBlackTime] = useState<number>(300);

  // Move History
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [, setCapturedPieces] = useState<CapturedPieces>({ w: [], b: [] });

  // Drawers & Modals — Open BotSelectorModal immediately on page load!
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState<boolean>(false);
  const [isBotModalOpen, setIsBotModalOpen] = useState<boolean>(true);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState<boolean>(false);
  const [hasGameStarted, setHasGameStarted] = useState<boolean>(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [isResignConfirmOpen, setIsResignConfirmOpen] = useState<boolean>(false);

  // 3D Scene Refs
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ChessScene | null>(null);
  const selectedSquareRef = useRef<Square | null>(null);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  const t = TRANSLATIONS.en;

  const updateMatedKingScreenCoords = useCallback(() => {
    const matedSq = matedKingSquareRef.current;
    if (!matedSq || !sceneRef.current) {
      setMatedKingScreenPos(null);
    } else {
      setMatedKingScreenPos(sceneRef.current.getKingTopRightScreenPosition(matedSq));
    }
  }, []);

  // Keep fresh references to callbacks so ChessScene never calls stale closures
  const handlersRef = useRef<{
    onSelect: (sq: Square) => void;
    onMove: (from: Square, to: Square) => void;
    onCamera: () => void;
  }>({
    onSelect: () => {},
    onMove: () => {},
    onCamera: () => {}
  });

  // 1. Initialize 3D Scene
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const scene = new ChessScene(canvasContainerRef.current);
    sceneRef.current = scene;

    scene.setTheme(settings.pieceTheme, settings.boardTheme, settings.showCoordinates);
    scene.setCameraMode('photo');
    scene.setPreviewMode(true);
    scene.setInteractionState(playerColor, true);
    scene.updateBoard(chess);

    scene.setCallbacks(
      (square: Square) => handlersRef.current.onSelect(square),
      (from: Square, to: Square) => handlersRef.current.onMove(from, to),
      () => handlersRef.current.onCamera()
    );

    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  // Sync playerColor & turn lock into 3D scene so player can never drag opponent pieces or move during bot's turn
  useEffect(() => {
    const canPlayerMove = !isGameOver && !isBotThinking && turn === playerColor;
    sceneRef.current?.setInteractionState(playerColor, canPlayerMove);
  }, [playerColor, isGameOver, isBotThinking, turn]);

  // Sync settings
  useEffect(() => {
    sounds.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setTheme(settings.pieceTheme, settings.boardTheme, settings.showCoordinates);
      sceneRef.current.setCameraMode(settings.cameraTilt);
    }
  }, [settings.pieceTheme, settings.boardTheme, settings.showCoordinates, settings.cameraTilt]);

  // Smoothly zoom board out in starting/preview interface, and zoom into game when starting
  useEffect(() => {
    sceneRef.current?.setPreviewMode(isBotModalOpen);
  }, [isBotModalOpen]);

  // 2. Clock Timer
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

  const handleTimeLoss = (loser: Color) => {
    setIsGameOver(true);
    const win = loser === 'w' ? 'b' : 'w';
    setWinner(win);
    setGameOverReason('Won on time');
    if (win === playerColor) {
      sounds.playVictory();
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
    } else {
      sounds.playDefeat();
    }
  };

  // Helper: Find a King's square on the board
  const findKingSquare = (kingColor: Color): Square | null => {
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === kingColor) {
          return p.square;
        }
      }
    }
    return null;
  };

  // 3. User Selects a Piece / Square
  const handleSquareSelect = (square: Square) => {
    if (isGameOver || isBotThinking || chess.turn() !== playerColor) return;

    // Toggle off: if user clicks the currently selected piece again, deselect it!
    if (selectedSquareRef.current === square) {
      selectedSquareRef.current = null;
      sceneRef.current?.setSelection(null, []);
      return;
    }

    const piece = chess.get(square);
    if (piece && piece.color === playerColor) {
      selectedSquareRef.current = square;
      const moves = chess.moves({ square, verbose: true });
      const targets = moves.map((m) => m.to);
      sceneRef.current?.setSelection(square, targets);
    } else {
      selectedSquareRef.current = null;
      sceneRef.current?.setSelection(null, []);
    }
  };

  // 4. Move Execution Attempt
  const handleMoveAttempt = (from: Square, to: Square) => {
    if (isGameOver || isBotThinking || chess.turn() !== playerColor) return;

    const moves = chess.moves({ square: from, verbose: true });
    const targetMove = moves.find((m) => m.to === to);

    if (targetMove) {
      if (
        targetMove.piece === 'p' &&
        ((targetMove.color === 'w' && to[1] === '8') || (targetMove.color === 'b' && to[1] === '1'))
      ) {
        setPendingPromotion({ from, to });
        return;
      }
      applyMove(from, to);
    } else {
      selectedSquareRef.current = null;
      sceneRef.current?.setSelection(null, []);
    }
  };

  const handlePromotionSelect = (promoted: PieceSymbol) => {
    if (pendingPromotion) {
      applyMove(pendingPromotion.from, pendingPromotion.to, promoted);
      setPendingPromotion(null);
    }
  };

  // 5. Apply Move
  const applyMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    try {
      const result = chess.move({ from, to, promotion: promotion || 'q' });
      if (!result) return;

      selectedSquareRef.current = null;
      sceneRef.current?.setSelection(null, []);
      sceneRef.current?.setLastMove(from, to);
      sceneRef.current?.clearHint();
      setHintInfo(null);

      if (chess.inCheck()) sounds.playCheck();
      else if (result.captured) sounds.playCapture();
      else if (result.san.includes('O-O')) sounds.playCastle();
      else sounds.playMove(false);

      sceneRef.current?.animateMove(from, to, () => {
        sceneRef.current?.updateBoard(chess);
      });

      setTurn(chess.turn());

      const rec: MoveRecord = {
        san: result.san,
        from: result.from,
        to: result.to,
        color: result.color,
        piece: result.piece,
        captured: result.captured,
        promotion: result.promotion as PieceSymbol,
        fen: chess.fen(),
        moveNumber: Math.floor(moveHistory.length / 2) + 1
      };
      setMoveHistory((prev) => [...prev, rec]);

      if (result.captured) {
        setCapturedPieces((prev) => {
          const key = result.color === 'w' ? 'w' : 'b';
          return { ...prev, [key]: [...prev[key], result.captured as PieceSymbol] };
        });
      }

      checkGameEnd();

      if (!chess.isGameOver() && chess.turn() !== playerColor) {
        sceneRef.current?.setInteractionState(playerColor, false);
        triggerBot();
      }
    } catch (err) {
      console.error('Error applying move:', err);
    }
  };

  // 6. Bot Move Execution (Human-speed response)
  const triggerBot = useCallback((botOverride?: BotProfile, colOverride?: Color) => {
    const activeBot = botOverride || selectedBot;
    const activePlayerColor = colOverride || playerColor;
    setIsBotThinking(true);
    sceneRef.current?.setInteractionState(activePlayerColor, false);

    stockfishEngine.getBestMove(chess, activeBot, (best) => {
      if (chess.isGameOver()) {
        setIsBotThinking(false);
        return;
      }

      try {
        const moveRes = chess.move({
          from: best.from,
          to: best.to,
          promotion: best.promotion || 'q'
        });

        if (moveRes) {
          sceneRef.current?.setLastMove(best.from, best.to);

          if (chess.inCheck()) sounds.playCheck();
          else if (moveRes.captured) sounds.playCapture();
          else if (moveRes.san.includes('O-O')) sounds.playCastle();
          else sounds.playMove(true);

          sceneRef.current?.animateMove(best.from, best.to, () => {
            sceneRef.current?.updateBoard(chess);
            setIsBotThinking(false);
            if (!chess.isGameOver()) {
              sceneRef.current?.setInteractionState(activePlayerColor, true);
            }
          });

          setTurn(chess.turn());

          const rec: MoveRecord = {
            san: moveRes.san,
            from: moveRes.from,
            to: moveRes.to,
            color: moveRes.color,
            piece: moveRes.piece,
            captured: moveRes.captured,
            promotion: moveRes.promotion as PieceSymbol,
            fen: chess.fen(),
            moveNumber: Math.floor(chess.history().length / 2)
          };
          setMoveHistory((prev) => [...prev, rec]);

          if (moveRes.captured) {
            setCapturedPieces((prev) => {
              const key = moveRes.color === 'w' ? 'w' : 'b';
              return { ...prev, [key]: [...prev[key], moveRes.captured as PieceSymbol] };
            });
          }

          checkGameEnd();
        } else {
          setIsBotThinking(false);
        }
      } catch (e) {
        console.error('Bot execution error:', e);
        setIsBotThinking(false);
      }
    });
  }, [chess, selectedBot, playerColor]);

  // Keep handlersRef synced with latest state & callbacks
  handlersRef.current = {
    onSelect: handleSquareSelect,
    onMove: handleMoveAttempt,
    onCamera: updateMatedKingScreenCoords
  };

  // 7. Checkmate & Game End (Chess.com Checkmate '#' Popup on King & Modal)
  const checkGameEnd = () => {
    if (chess.isCheckmate()) {
      setIsGameOver(true);
      setIsGameOverModalOpen(true);
      const loserColor = chess.turn();
      const win = loserColor === 'w' ? 'b' : 'w';
      setWinner(win);
      setGameOverReason('Checkmate');

      const kingSq = findKingSquare(loserColor);
      matedKingSquareRef.current = kingSq;
      setMatedKingSquare(kingSq);
      if (kingSq && sceneRef.current) {
        setMatedKingScreenPos(sceneRef.current.getKingTopRightScreenPosition(kingSq));
      }

      sounds.playVictory();
      // Arya Anime Voice: "Checkmate! Congratulations!"
      setTimeout(() => {
        sounds.playAryaCheckmate();
      }, 400);

      if (win === playerColor) {
        confetti({
          particleCount: 95,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
      return;
    }

    if (chess.isStalemate()) {
      setIsGameOver(true);
      setIsGameOverModalOpen(true);
      setWinner('draw');
      setGameOverReason('Stalemate');
      sounds.playVictory();
    } else if (chess.isThreefoldRepetition()) {
      setIsGameOver(true);
      setIsGameOverModalOpen(true);
      setWinner('draw');
      setGameOverReason('Threefold Repetition');
      sounds.playVictory();
    } else if (chess.isInsufficientMaterial()) {
      setIsGameOver(true);
      setIsGameOverModalOpen(true);
      setWinner('draw');
      setGameOverReason('Insufficient Material');
      sounds.playVictory();
    } else if (chess.isDraw()) {
      setIsGameOver(true);
      setIsGameOverModalOpen(true);
      setWinner('draw');
      setGameOverReason('50-Move Rule');
      sounds.playVictory();
    }
  };

  // 8. New Game / Restart (Instant setup with Chess.com game-start sound, no cascade)
  const handleStartGame = (bot?: BotProfile, col?: Color, tc?: TimeControl) => {
    chess.reset();
    selectedSquareRef.current = null;
    matedKingSquareRef.current = null;
    setMatedKingSquare(null);
    setMatedKingScreenPos(null);
    setIsGameOverModalOpen(false);

    const newBot = bot || selectedBot;
    const newCol = col || playerColor;
    const newTc = tc || timeControl;

    setSelectedBot(newBot);
    setPlayerColor(newCol);
    setTimeControl(newTc);

    const initTime = newTc === 'unlimited' ? 300 : parseInt(newTc, 10);
    setWhiteTime(initTime);
    setBlackTime(initTime);

    sceneRef.current?.setSelection(null, []);
    sceneRef.current?.setLastMove(null, null);
    sceneRef.current?.clearHint();

    const flipped = newCol === 'b';
    setIsFlipped(flipped);
    sceneRef.current?.flipBoard(flipped);
    sceneRef.current?.updateBoard(chess);

    sounds.playGameStart();

    setTurn(chess.turn());
    setIsGameOver(false);
    setWinner(null);
    setGameOverReason('');
    setMoveHistory([]);
    setCapturedPieces({ w: [], b: [] });
    setHintInfo(null);

    setHasGameStarted(true);
    setIsBotModalOpen(false);

    if (newCol === 'b') {
      sceneRef.current?.setInteractionState(newCol, false);
      setTimeout(() => triggerBot(newBot, newCol), 200);
    } else {
      sceneRef.current?.setInteractionState(newCol, true);
    }
  };

  // 9. Undo Move
  const handleUndo = () => {
    if (isBotThinking || moveHistory.length === 0) return;

    const undos = chess.turn() === playerColor ? 2 : 1;
    for (let i = 0; i < undos; i++) {
      chess.undo();
    }

    matedKingSquareRef.current = null;
    setMatedKingSquare(null);
    setMatedKingScreenPos(null);
    setIsGameOver(false);
    setWinner(null);
    setGameOverReason('');

    selectedSquareRef.current = null;
    sceneRef.current?.setSelection(null, []);
    sceneRef.current?.clearHint();
    sceneRef.current?.updateBoard(chess);

    setTurn(chess.turn());
    setMoveHistory((prev) => prev.slice(0, Math.max(0, prev.length - undos)));
    setHintInfo(null);
  };

  // 10. Flip Board
  const handleFlip = () => {
    const next = !isFlipped;
    setIsFlipped(next);
    sceneRef.current?.flipBoard(next);
  };

  // 11. Hint
  const handleHint = () => {
    if (isGameOver || isBotThinking || chess.turn() !== playerColor) return;

    stockfishEngine.getBestMove(chess, CHESS_COM_BOTS[5], (res) => {
      setHintInfo({ from: res.from, to: res.to });
      sceneRef.current?.showHint(res.from, res.to);
    });
  };

  // 12. Resign
  const handleResign = () => {
    setIsResignConfirmOpen(true);
  };

  const confirmResign = () => {
    setIsResignConfirmOpen(false);
    setIsGameOver(true);
    setIsGameOverModalOpen(true);
    const win = playerColor === 'w' ? 'b' : 'w';
    setWinner(win);
    setGameOverReason('Resigned');
    sounds.playDefeat();
  };

  // Determine Arya's Companion State
  const aryaState: AryaState = isGameOver
    ? winner === playerColor
      ? 'victory'
      : winner === 'draw'
      ? 'draw'
      : 'defeat'
    : moveHistory.length === 0 && !isBotThinking
    ? 'start'
    : isBotThinking
    ? 'bot_moving'
    : 'thinking';

  // Clean Chess.com style turn & move text
  const currentMoveNumber = Math.floor(moveHistory.length / 2) + 1;
  const lastMoveSan = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].san : null;
  const statusText = isGameOver
    ? `${gameOverReason} • ${winner === 'w' ? '1-0' : winner === 'b' ? '0-1' : '½-½'}`
    : turn === 'w'
    ? `${currentMoveNumber}. White to move`
    : `${currentMoveNumber}... Black to move`;

  const formatClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#161512] text-[#f1f1f1] select-none font-sans">
      {/* 3D Viewport: Fullscreen board preview on authentic wood plank table */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full cursor-pointer z-10" />

      {/* Main Chessboard HUD: Always available */}
      {/* ========================================================
          CHESS.COM ON-BOARD CHECKMATE SPEECH CALLOUT
          ======================================================== */}
      {isGameOver && matedKingSquare && matedKingScreenPos && (
        <div
          style={{
            left: `${matedKingScreenPos.x}px`,
            top: `${matedKingScreenPos.y}px`
          }}
          className="fixed z-30 pointer-events-auto flex flex-col items-center animate-checkmate-pop cursor-pointer"
          onClick={() => setIsGameOverModalOpen(true)}
          title="Click to view Game Over details"
        >
          {/* Authentic Chess.com Red Checkmate Speech Badge */}
          <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#b32b28] via-[#ca3431] to-[#b32b28] border border-white/35 shadow-[0_8px_24px_rgba(202,52,49,0.7),0_2px_8px_rgba(0,0,0,0.6)] flex items-center gap-2 text-white">
            <div className="w-5 h-5 rounded-full bg-white/25 border border-white/40 flex items-center justify-center font-black text-xs leading-none">
              #
            </div>
            <span className="text-xs font-black tracking-wider uppercase drop-shadow-xs">Checkmate</span>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-black/25 text-white/95">
              {winner === 'w' ? '1-0' : '0-1'}
            </span>
          </div>
          {/* Speech Bubble Arrow pointing straight down at King */}
          <div className="w-0 h-0 border-x-[6px] border-x-transparent border-t-[7px] border-t-[#ca3431] -mt-[0.5px] drop-shadow-sm" />
        </div>
      )}

      {/* ========================================================
          TOP-CENTER OPPONENT BOT CARD (Chess.com style)
          ======================================================== */}
      <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <button
          onClick={() => setIsBotModalOpen(true)}
          title="Click to change opponent bot"
          className="px-3 py-1.5 rounded-xl bg-[#262421]/90 hover:bg-[#312e2b] border border-white/12 shadow-lg backdrop-blur-md flex items-center gap-2.5 transition-all cursor-pointer group"
        >
          <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-[#1e1d1a] border border-white/15 shrink-0">
            <img
              src={selectedBot.avatar}
              alt={selectedBot.name}
              className="w-full h-full object-cover"
            />
            {isBotThinking && (
              <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-[#81b64c] animate-ping" />
            )}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">{selectedBot.name}</span>
              <span
                className={`text-[11px] font-bold px-1.5 py-0.2 rounded border ${
                  selectedBot.id === 'ayanokouji'
                    ? 'bg-red-500/20 text-red-300 border-red-400/30'
                    : 'bg-[#312e2b] text-[#81b64c] border-white/10'
                }`}
              >
                {selectedBot.eloDisplay || selectedBot.elo}
              </span>
            </div>
            <div className="text-[10px] text-[#9e9b95] font-medium flex items-center gap-1">
              <span>{isBotThinking ? 'Thinking...' : selectedBot.personalityTag}</span>
              <span className="text-white/40 group-hover:text-white/80 transition-colors">• Change</span>
            </div>
          </div>
        </button>
      </div>

      {/* ========================================================
          TOP-LEFT CORNER CONTROLS (Clean Chess.com Dark Slate Icons)
          ======================================================== */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2.5">
        <button
          onClick={() => setIsMenuDrawerOpen(true)}
          className="w-10 h-10 rounded-lg bg-[#262421]/85 hover:bg-[#312e2b] border border-white/12 text-[#e2ded9] hover:text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          title="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={handleFlip}
          className="w-10 h-10 rounded-lg bg-[#262421]/85 hover:bg-[#312e2b] border border-white/12 text-[#e2ded9] hover:text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95 text-lg font-bold cursor-pointer"
          title="Flip Board"
        >
          ↻
        </button>
      </div>

      {/* ========================================================
          TOP-RIGHT CORNER CONTROLS (Undo, Hint, Zoom +/-)
          ======================================================== */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2.5 items-end">
        <button
          onClick={handleUndo}
          disabled={moveHistory.length === 0 || isBotThinking}
          className="w-10 h-10 rounded-lg bg-[#262421]/85 hover:bg-[#312e2b] border border-white/12 text-[#e2ded9] hover:text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-lg font-bold cursor-pointer"
          title="Undo Move"
        >
          ↶
        </button>

        <button
          onClick={handleHint}
          disabled={isBotThinking || isGameOver || chess.turn() !== playerColor}
          className="w-10 h-10 rounded-lg bg-[#262421]/85 hover:bg-[#312e2b] border border-white/12 text-[#e2ded9] hover:text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          title="Hint"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-[2]">
            <path d="M9 18h6m-4 3h2m-5-9a6 6 0 1 1 8 0c-.8.8-1.5 2-1.5 3h-5c0-1-.7-2.2-1.5-3z" />
          </svg>
        </button>

        <div className="flex flex-col rounded-lg bg-[#262421]/85 border border-white/12 shadow-lg backdrop-blur-md overflow-hidden">
          <button
            onClick={() => sceneRef.current?.adjustZoom(0.12)}
            className="w-10 h-9 hover:bg-[#312e2b] text-[#e2ded9] hover:text-white flex items-center justify-center border-b border-white/8 transition-colors cursor-pointer"
            title="Zoom In (or pinch touchpad)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => sceneRef.current?.adjustZoom(-0.12)}
            className="w-10 h-9 hover:bg-[#312e2b] text-[#e2ded9] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Zoom Out (or pinch touchpad)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================
          ARYA ANIME COMPANION (Thinking emotion & Victory Jump!)
          ======================================================== */}
      <AryaCompanion
        state={aryaState}
        botName={selectedBot.name}
        botElo={selectedBot.elo}
        onClickChangeBot={() => setIsBotModalOpen(true)}
      />

      {/* ========================================================
          CLEAN CHESS.COM-STYLE BOTTOM BAR
          ======================================================== */}
      <div className="absolute bottom-3 left-0 right-0 z-20 pointer-events-none flex justify-center px-4">
        <div className="pointer-events-auto px-4 py-1.5 rounded-lg bg-[#262421]/90 border border-white/10 shadow-lg backdrop-blur-md flex items-center gap-4 text-xs">
          {/* Last move pill if available */}
          {lastMoveSan && (
            <span className="px-2 py-0.5 rounded bg-[#312e2b] text-[#81b64c] font-bold">
              {lastMoveSan}
            </span>
          )}

          {/* Turn or Game Over status */}
          <span className="font-semibold text-[#e2ded9]">
            {statusText}
          </span>

          {/* Clock if timed */}
          {timeControl !== 'unlimited' && (
            <span className="font-mono font-bold text-white bg-[#1f1e1b] px-2 py-0.5 rounded border border-white/8">
              {formatClock(playerColor === 'w' ? whiteTime : blackTime)}
            </span>
          )}

          {/* Hint move pill if active */}
          {hintInfo && !isGameOver && (
            <span className="text-[#81b64c] font-bold">
              Hint: {hintInfo.from.toUpperCase()} → {hintInfo.to.toUpperCase()}
            </span>
          )}

          {/* Inline Rematch / Change Bot buttons on Game Over */}
          {isGameOver && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/12">
              <button
                onClick={() => handleStartGame()}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#81b64c] hover:bg-[#91c859] text-white font-bold text-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rematch</span>
              </button>
              <button
                onClick={() => setIsBotModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#312e2b] hover:bg-[#3d3935] text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Bots</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SLIDE-OUT MENU DRAWER */}
      <MenuDrawer
        isOpen={isMenuDrawerOpen}
        bot={selectedBot}
        settings={settings}
        moveHistory={moveHistory}
        language="en"
        onClose={() => setIsMenuDrawerOpen(false)}
        onOpenBotSelector={() => setIsBotModalOpen(true)}
        onRestartMatch={() => handleStartGame()}
        onResign={handleResign}
        onUpdateSettings={(newVals) => setSettings((s) => ({ ...s, ...newVals }))}
      />

      {/* CHESS.COM GAME OVER MODAL */}
      <GameOverModal
        isOpen={isGameOverModalOpen}
        winner={winner}
        reason={gameOverReason}
        playerColor={playerColor}
        selectedBot={selectedBot}
        moveCount={Math.floor(moveHistory.length / 2)}
        onRematch={() => handleStartGame(selectedBot, playerColor, timeControl)}
        onSelectBot={() => {
          setIsGameOverModalOpen(false);
          setIsBotModalOpen(true);
        }}
        onClose={() => setIsGameOverModalOpen(false)}
      />

      {/* Floating Re-Open Details Pill when modal is dismissed */}
      {isGameOver && !isGameOverModalOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={() => setIsGameOverModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#262421]/95 hover:bg-[#312e2b] border border-white/18 text-white font-bold text-xs flex items-center gap-2 shadow-[0_8px_24px_rgba(0,0,0,0.7)] backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-[#ffd54f]" />
            <span>Game Over • View Details</span>
          </button>
        </div>
      )}

      {/* BOT SELECTOR MODAL (Floating modal with preview board visible behind) */}
      <BotSelectorModal
        isOpen={isBotModalOpen}
        selectedBot={selectedBot}
        selectedColor={playerColor}
        timeControl={timeControl}
        language="en"
        onSelectBot={setSelectedBot}
        onSelectColor={setPlayerColor}
        onSelectTimeControl={setTimeControl}
        onStartGame={() => handleStartGame(selectedBot, playerColor, timeControl)}
        onClose={() => setIsBotModalOpen(false)}
      />

      {/* PAWN PROMOTION MODAL */}
      <PromotionModal
        isOpen={pendingPromotion !== null}
        color={playerColor}
        language="en"
        onSelectPiece={handlePromotionSelect}
      />

      {/* RESIGN CONFIRMATION */}
      {isResignConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-[#262421] text-[#f1f1f1] rounded-xl border border-white/12 p-5 shadow-2xl text-center">
            <h4 className="text-sm font-bold text-white mb-1.5">{t.confirmResignTitle}</h4>
            <p className="text-xs text-[#9e9b95] mb-4">{t.confirmResignMsg}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsResignConfirmOpen(false)}
                className="flex-1 py-2 rounded-lg bg-[#312e2b] text-xs font-semibold hover:bg-[#3d3935] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmResign}
                className="flex-1 py-2 rounded-lg bg-[#e53935] hover:bg-[#d32f2f] text-xs font-bold text-white shadow-md transition-colors cursor-pointer"
              >
                Resign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
