import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { BotProfile, CapturedPieces, GameSettings, MoveRecord, TimeControl } from './types/chess';
import { CHESS_COM_BOTS, TRANSLATIONS } from './locales/i18n';
import { ChessScene } from './three/ChessScene';
import { stockfishEngine } from './engine/stockfishEngine';
import { sounds } from './audio/soundEffects';
import { BotSelectorModal } from './components/BotSelectorModal';
import { PromotionModal } from './components/PromotionModal';
import { GameOverModal } from './components/GameOverModal';
import { MenuDrawer } from './components/MenuDrawer';
import {
  Menu,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export const App: React.FC = () => {
  // Core Chess State
  const [chess] = useState<Chess>(() => new Chess());
  const [turn, setTurn] = useState<Color>('w');
  const [inCheck, setInCheck] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<Color | 'draw' | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string>('');
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [hintInfo, setHintInfo] = useState<{ from: Square; to: Square } | null>(null);

  // Settings: 100% matched to reference photo
  const [settings, setSettings] = useState<GameSettings>({
    language: 'vi',
    pieceTheme: 'classic-wood', // photo style: polished ivory & ebony wood
    boardTheme: 'rustic-wood',  // photo style: authentic maple & walnut on rustic table
    soundEnabled: true,
    showCoordinates: true,
    showLegalMoves: true,
    showEvaluationBar: false,   // COMPLETELY REMOVED from screen as requested
    cameraTilt: 'photo'
  });

  // Current Bot: Defaults to beginner/Nelson
  const [selectedBot, setSelectedBot] = useState<BotProfile>(CHESS_COM_BOTS[0]); // Jimmy (Beginner)
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [timeControl, setTimeControl] = useState<TimeControl>('unlimited');
  const [whiteTime, setWhiteTime] = useState<number>(300);
  const [blackTime, setBlackTime] = useState<number>(300);

  // Move History
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [capturedPieces, setCapturedPieces] = useState<CapturedPieces>({ w: [], b: [] });

  // Drawers & Modals
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState<boolean>(false);
  const [isBotModalOpen, setIsBotModalOpen] = useState<boolean>(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState<boolean>(false);
  const [isResignConfirmOpen, setIsResignConfirmOpen] = useState<boolean>(false);

  // 3D Scene Refs
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ChessScene | null>(null);
  const selectedSquareRef = useRef<Square | null>(null);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  const t = TRANSLATIONS[settings.language];

  // 1. Initialize 3D Scene
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const scene = new ChessScene(canvasContainerRef.current);
    sceneRef.current = scene;

    scene.setTheme(settings.pieceTheme, settings.boardTheme, settings.showCoordinates);
    scene.setCameraMode('photo');
    scene.updateBoard(chess);

    scene.setCallbacks(
      (square: Square) => handleSquareSelect(square),
      (from: Square, to: Square) => handleMoveAttempt(from, to)
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
    setGameOverReason(settings.language === 'vi' ? 'Hết thời gian thi đấu!' : 'Flagged on time!');
    setIsGameOverModalOpen(true);
    if (win === playerColor) sounds.playVictory();
    else sounds.playDefeat();
  };

  // 3. User Selects a Piece / Square
  const handleSquareSelect = (square: Square) => {
    if (isGameOver || isBotThinking || chess.turn() !== playerColor) return;

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

      // Play authentic move sound
      if (result.captured) sounds.playCapture();
      else if (result.san.includes('O-O')) sounds.playCastle();
      else if (chess.inCheck()) sounds.playCheck();
      else sounds.playMove();

      // Animate piece
      sceneRef.current?.animateMove(from, to, () => {
        sceneRef.current?.updateBoard(chess);
      });

      setTurn(chess.turn());
      setInCheck(chess.inCheck());

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

  // 6. Bot Move Execution
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
          setInCheck(chess.inCheck());

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

  // 7. Check Game Over
  const checkGameEnd = () => {
    if (chess.isCheckmate()) {
      setIsGameOver(true);
      const win = chess.turn() === 'w' ? 'b' : 'w';
      setWinner(win);
      setGameOverReason(t.checkmate);
      setIsGameOverModalOpen(true);
      if (win === playerColor) sounds.playVictory();
      else sounds.playDefeat();
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

  // 8. New Game / Restart
  const handleStartGame = (bot?: BotProfile, col?: Color, tc?: TimeControl) => {
    chess.reset();
    selectedSquareRef.current = null;

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

    setTurn(chess.turn());
    setInCheck(false);
    setIsGameOver(false);
    setWinner(null);
    setGameOverReason('');
    setMoveHistory([]);
    setCapturedPieces({ w: [], b: [] });
    setHintInfo(null);

    setIsBotModalOpen(false);
    setIsGameOverModalOpen(false);

    if (newCol === 'b') {
      setTimeout(() => triggerBot(), 500);
    }
  };

  // 9. Undo Move
  const handleUndo = () => {
    if (isGameOver || isBotThinking || moveHistory.length === 0) return;

    const undos = chess.turn() === playerColor ? 2 : 1;
    for (let i = 0; i < undos; i++) {
      chess.undo();
    }

    selectedSquareRef.current = null;
    sceneRef.current?.setSelection(null, []);
    sceneRef.current?.clearHint();
    sceneRef.current?.updateBoard(chess);

    setTurn(chess.turn());
    setInCheck(chess.inCheck());
    setMoveHistory((prev) => prev.slice(0, Math.max(0, prev.length - undos)));
    setHintInfo(null);

    // Rebuild captured
    const full: PieceSymbol[] = ['p','p','p','p','p','p','p','p','r','r','n','n','b','b','q','k'];
    const wRem: PieceSymbol[] = [...full];
    const bRem: PieceSymbol[] = [...full];
    chess.board().forEach((row) => {
      row.forEach((sq) => {
        if (sq) {
          const list = sq.color === 'w' ? wRem : bRem;
          const idx = list.indexOf(sq.type);
          if (idx > -1) list.splice(idx, 1);
        }
      });
    });
    setCapturedPieces({
      w: bRem.filter((p): p is PieceSymbol => p !== 'k'),
      b: wRem.filter((p): p is PieceSymbol => p !== 'k')
    });
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
    setGameOverReason(settings.language === 'vi' ? 'Bạn đã chịu thua.' : 'Player resigned.');
    setIsGameOverModalOpen(true);
    sounds.playDefeat();
  };

  // Turn Text for bottom wooden rim (matches reference photo: "1. White's move")
  const currentMoveNumber = Math.floor(moveHistory.length / 2) + 1;
  const currentMoveText = turn === 'w'
    ? `${currentMoveNumber}. White's move`
    : `${currentMoveNumber}. Black's move`;

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#160f0a] text-[#ede8e1] select-none font-sans">
      {/* 3D Viewport: Fullscreen wooden table & board */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full cursor-pointer" />

      {/* ========================================================
          TOP-LEFT CORNER ICONS (MATCHING USER REFERENCE PHOTO)
          ======================================================== */}
      <div className="absolute top-5 left-5 z-20 flex flex-col gap-3.5">
        {/* 1. Hamburger Menu Button (Square with 3 white lines) */}
        <button
          onClick={() => setIsMenuDrawerOpen(true)}
          className="w-12 h-12 rounded-xl bg-black/40 hover:bg-black/60 border border-white/20 text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95"
          title={t.menu}
        >
          <Menu className="w-7 h-7 text-white stroke-[2.5]" />
        </button>

        {/* 2. Reset / Rotate / Flip Button (Circular arrow) */}
        <button
          onClick={handleFlip}
          className="w-12 h-12 rounded-xl bg-black/40 hover:bg-black/60 border border-white/20 text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95 text-2xl font-bold"
          title={t.flipBoard}
        >
          <span className="text-white text-2xl -mt-0.5">↻</span>
        </button>
      </div>

      {/* ========================================================
          TOP-RIGHT CORNER ICONS (MATCHING USER REFERENCE PHOTO)
          ======================================================== */}
      <div className="absolute top-5 right-5 z-20 flex flex-col gap-3.5 items-end">
        {/* 1. Undo Button (Curved counterclockwise arrow) */}
        <button
          onClick={handleUndo}
          disabled={moveHistory.length === 0 || isBotThinking || isGameOver}
          className="w-12 h-12 rounded-xl bg-black/40 hover:bg-black/60 border border-white/20 text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95 disabled:opacity-25 disabled:pointer-events-none text-2xl font-bold"
          title={t.undo}
        >
          <span className="text-white text-2xl -mt-1 font-bold">↶</span>
        </button>

        {/* 2. Piece Theme Toggle Button (Pawn outline / Liquid glass toggle) */}
        <button
          onClick={() => {
            const nextTheme = settings.pieceTheme === 'classic-wood' ? 'liquid-glass' : 'classic-wood';
            setSettings((s) => ({ ...s, pieceTheme: nextTheme }));
          }}
          className="w-12 h-12 rounded-xl bg-black/40 hover:bg-black/60 border border-white/20 text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95"
          title={settings.pieceTheme === 'classic-wood' ? 'Bật chế độ Thủy Tinh Lỏng' : 'Chuyển về Gỗ Cổ Điển'}
        >
          {settings.pieceTheme === 'classic-wood' ? (
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-white stroke-[2]">
              {/* Clean pawn silhouette icon matching photo */}
              <circle cx="12" cy="6" r="3" />
              <path d="M9 10h6c0 3-1.5 5-1.5 7h3.5v3H7v-3h3.5c0-2-1.5-4-1.5-7z" />
            </svg>
          ) : (
            <span className="text-2xl">💎</span>
          )}
        </button>

        {/* 3. Lightbulb Hint Button (Outlined lightbulb) */}
        <button
          onClick={handleHint}
          disabled={isBotThinking || isGameOver || chess.turn() !== playerColor}
          className="w-12 h-12 rounded-xl bg-black/40 hover:bg-black/60 border border-white/20 text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95 disabled:opacity-25 disabled:pointer-events-none"
          title={t.hint}
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-white stroke-[2]">
            <path d="M9 18h6m-4 3h2m-5-9a6 6 0 1 1 8 0c-.8.8-1.5 2-1.5 3h-5c0-1-.7-2.2-1.5-3z" />
          </svg>
        </button>
      </div>

      {/* ========================================================
          BOTTOM BEVEL TEXT (100% IDENTICAL TO REFERENCE PHOTO!)
          "BEGINNER LEVEL" on the left, "1. White's move" on the right
          ======================================================== */}
      <div className="absolute bottom-2.5 left-0 right-0 z-20 pointer-events-none flex justify-center px-4">
        <div className="w-full max-w-[560px] flex items-center justify-between text-[13px] tracking-wider text-[#d4c3b7] drop-shadow-md select-none font-serif">
          {/* Left: Level / Bot Name (e.g. "BEGINNER LEVEL") */}
          <span className="font-semibold tracking-widest text-[#e8dacd] uppercase opacity-90">
            {selectedBot.id === 'jimmy' ? 'BEGINNER LEVEL' : `${selectedBot.name.toUpperCase()} (${selectedBot.elo})`}
          </span>

          {/* Right: Current Turn in Italic (e.g. "1. White's move") */}
          <span className="italic font-serif text-[13px] tracking-wide text-[#eedfd2] opacity-95">
            {currentMoveText}
          </span>
        </div>
      </div>

      {/* Subtle Hint Banner (only when Hint 💡 is tapped) */}
      {hintInfo && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-black/75 border border-amber-400/60 text-amber-200 text-xs font-semibold px-4 py-1.5 rounded-full shadow-2xl animate-fadeIn flex items-center gap-2 backdrop-blur-sm">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{hintInfo.from.toUpperCase()} ➔ {hintInfo.to.toUpperCase()}</span>
        </div>
      )}

      {/* Check Alert Banner */}
      {inCheck && !isGameOver && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-[#4a1010]/85 border border-red-500/70 text-red-200 text-xs font-bold px-4 py-1.5 rounded-full shadow-2xl animate-pulse tracking-wide backdrop-blur-sm">
          {t.check}
        </div>
      )}

      {/* SLIDE-OUT MENU DRAWER (Triggered by ☰ Button) */}
      <MenuDrawer
        isOpen={isMenuDrawerOpen}
        bot={selectedBot}
        settings={settings}
        moveHistory={moveHistory}
        language={settings.language}
        onClose={() => setIsMenuDrawerOpen(false)}
        onOpenBotSelector={() => setIsBotModalOpen(true)}
        onRestartMatch={() => handleStartGame()}
        onResign={handleResign}
        onUpdateSettings={(newVals) => setSettings((s) => ({ ...s, ...newVals }))}
      />

      {/* BOT SELECTOR MODAL */}
      <BotSelectorModal
        isOpen={isBotModalOpen}
        selectedBot={selectedBot}
        selectedColor={playerColor}
        timeControl={timeControl}
        language={settings.language}
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
        language={settings.language}
        onSelectPiece={handlePromotionSelect}
      />

      {/* GAME OVER MODAL */}
      <GameOverModal
        isOpen={isGameOverModalOpen}
        winner={winner}
        reason={gameOverReason}
        playerColor={playerColor}
        bot={selectedBot}
        language={settings.language}
        onRematch={() => handleStartGame()}
        onChangeBot={() => {
          setIsGameOverModalOpen(false);
          setIsBotModalOpen(true);
        }}
      />

      {/* RESIGN CONFIRMATION */}
      {isResignConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[#1c1511] text-[#ede8e1] rounded-xl border border-[#443326] p-5 shadow-2xl text-center">
            <h4 className="text-base font-bold text-white mb-2">{t.confirmResignTitle}</h4>
            <p className="text-xs text-[#a89a8e] mb-5">{t.confirmResignMsg}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsResignConfirmOpen(false)}
                className="flex-1 py-2 rounded-lg bg-[#291e17] text-xs font-semibold hover:bg-[#382920] transition-colors"
              >
                {t.confirmNo}
              </button>
              <button
                onClick={confirmResign}
                className="flex-1 py-2 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-xs font-bold text-white shadow-lg transition-colors"
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
