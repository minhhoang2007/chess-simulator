import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import confetti from 'canvas-confetti';
import { BotProfile, CapturedPieces, GameSettings, MoveRecord, TimeControl } from './types/chess';
import { CHESS_COM_BOTS, TRANSLATIONS } from './locales/i18n';
import { ChessScene } from './three/ChessScene';
import { stockfishEngine } from './engine/stockfishEngine';
import { sounds } from './audio/soundEffects';
import { BotSelectorModal } from './components/BotSelectorModal';
import { PromotionModal } from './components/PromotionModal';
import { MenuDrawer } from './components/MenuDrawer';
import { AryaCompanion, AryaState } from './components/AryaCompanion';
import { Menu, RotateCcw, Users, ZoomIn, ZoomOut } from 'lucide-react';

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
    const sq = matedKingSquareRef.current;
    if (!sq || !sceneRef.current) {
      setMatedKingScreenPos(null);
      return;
    }
    const coords = sceneRef.current.getKingTopRightScreenPosition(sq);
    setMatedKingScreenPos(coords);
  }, []);

  // 1. Initialize 3D Scene
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const scene = new ChessScene(canvasContainerRef.current);
    sceneRef.current = scene;

    scene.setTheme(settings.pieceTheme, settings.boardTheme, settings.showCoordinates);
    scene.setCameraMode('photo');
    scene.setPreviewMode(true);
    // At startup: board is clear/empty per user request. Pieces are set up with fast cascade when game starts!
    scene.clearBoard();

    scene.setCallbacks(
      (square: Square) => handleSquareSelect(square),
      (from: Square, to: Square) => handleMoveAttempt(from, to),
      () => updateMatedKingScreenCoords()
    );

    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

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

      if (result.captured) sounds.playCapture();
      else if (result.san.includes('O-O')) sounds.playCastle();
      else if (chess.inCheck()) sounds.playCheck();
      else sounds.playMove();

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
        triggerBot();
      }
    } catch (err) {
      console.error('Error applying move:', err);
    }
  };

  // 6. Bot Move Execution (Human-speed response)
  const triggerBot = useCallback(() => {
    setIsBotThinking(true);

    stockfishEngine.getBestMove(chess, selectedBot, (best) => {
      setIsBotThinking(false);
      if (chess.isGameOver()) return;

      try {
        const moveRes = chess.move({
          from: best.from,
          to: best.to,
          promotion: best.promotion || 'q'
        });

        if (moveRes) {
          sceneRef.current?.setLastMove(best.from, best.to);

          if (moveRes.captured) sounds.playCapture();
          else if (moveRes.san.includes('O-O')) sounds.playCastle();
          else if (chess.inCheck()) sounds.playCheck();
          else sounds.playMove();

          sceneRef.current?.animateMove(best.from, best.to, () => {
            sceneRef.current?.updateBoard(chess);
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
            moveNumber: Math.floor(moveHistory.length / 2) + 1
          };
          setMoveHistory((prev) => [...prev, rec]);

          if (moveRes.captured) {
            setCapturedPieces((prev) => {
              const key = moveRes.color === 'w' ? 'w' : 'b';
              return { ...prev, [key]: [...prev[key], moveRes.captured as PieceSymbol] };
            });
          }

          checkGameEnd();
        }
      } catch (e) {
        console.error('Bot execution error:', e);
      }
    });
  }, [chess, selectedBot, playerColor, moveHistory.length]);

  // 7. Check Game Over (Chess.com Checkmate Popup on Checkmated King!)
  const checkGameEnd = () => {
    if (chess.isCheckmate()) {
      setIsGameOver(true);
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

      if (win === playerColor) {
        sounds.playVictory();
        confetti({
          particleCount: 85,
          spread: 75,
          origin: { y: 0.6 }
        });
      } else {
        sounds.playDefeat();
      }
    } else if (chess.isStalemate()) {
      setIsGameOver(true);
      setWinner('draw');
      setGameOverReason('Stalemate');
    } else if (chess.isThreefoldRepetition()) {
      setIsGameOver(true);
      setWinner('draw');
      setGameOverReason('Threefold Repetition');
    } else if (chess.isInsufficientMaterial()) {
      setIsGameOver(true);
      setWinner('draw');
      setGameOverReason('Insufficient Material');
    } else if (chess.isDraw()) {
      setIsGameOver(true);
      setWinner('draw');
      setGameOverReason('50-Move Rule');
    }
  };

  // 8. New Game / Restart
  const handleStartGame = (bot?: BotProfile, col?: Color, tc?: TimeControl) => {
    chess.reset();
    selectedSquareRef.current = null;
    matedKingSquareRef.current = null;
    setMatedKingSquare(null);
    setMatedKingScreenPos(null);

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

    // Snappy ultra-fast piece arrangement effect ("sắp lần lượt các quân nhưng cực nhanh")
    sounds.playMove();
    sceneRef.current?.animateBoardSetup(chess, () => {
      // If player is playing black, trigger bot after board setup completes
      if (newCol === 'b') {
        setTimeout(() => triggerBot(), 150);
      }
    });

    setTurn(chess.turn());
    setIsGameOver(false);
    setWinner(null);
    setGameOverReason('');
    setMoveHistory([]);
    setCapturedPieces({ w: [], b: [] });
    setHintInfo(null);

    setHasGameStarted(true);
    setIsBotModalOpen(false);
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
      {/* 3D Viewport: Fullscreen board preview (slightly smaller mode) */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full cursor-pointer" />

      {/* Main Chessboard HUD: Always available */}
      {/* ========================================================
          CHESS.COM CHECKMATE POPUP ON TOP-RIGHT OF CHECKMATED KING
          ======================================================== */}
      {isGameOver && matedKingSquare && matedKingScreenPos && (
        <div
          style={{
            left: `${matedKingScreenPos.x}px`,
            top: `${matedKingScreenPos.y}px`
          }}
          className="fixed z-30 pointer-events-none animate-checkmate-pop flex items-center gap-2"
        >
          {/* Iconic Chess.com Red Checkmate '#' Circle Badge right on the King's top-right corner */}
          <div className="w-8 h-8 rounded-full bg-[#e53935] border-2 border-white shadow-[0_4px_14px_rgba(229,57,53,0.75)] flex items-center justify-center text-white font-black text-base leading-none shrink-0">
            #
          </div>

          {/* Clean Chess.com Checkmate Callout Pill */}
          <div className="px-3 py-1.5 rounded-lg bg-[#262421]/95 border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.65)] backdrop-blur-md flex items-center gap-2 whitespace-nowrap">
            <span className="text-xs font-extrabold tracking-tight text-white">
              Checkmate
            </span>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-[#e53935]/20 text-[#ff8a80]">
              {winner === 'w' ? '1-0' : '0-1'}
            </span>
          </div>
        </div>
      )}

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
