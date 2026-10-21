import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { BotProfile, CapturedPieces, EvaluationState, GameSettings, MoveRecord, TimeControl } from './types/chess';
import { CHESS_COM_BOTS, TRANSLATIONS } from './locales/i18n';
import { ChessScene } from './three/ChessScene';
import { stockfishEngine } from './engine/stockfishEngine';
import { sounds } from './audio/soundEffects';
import { EvaluationBar } from './components/EvaluationBar';
import { CapturedPiecesView } from './components/CapturedPiecesView';
import { BotSelectorModal } from './components/BotSelectorModal';
import { PromotionModal } from './components/PromotionModal';
import { GameOverModal } from './components/GameOverModal';
import { MenuDrawer } from './components/MenuDrawer';
import {
  Menu,
  RotateCcw,
  Lightbulb,
  Sparkles,
  Timer as TimerIcon
} from 'lucide-react';

export const App: React.FC = () => {
  // Chess engine
  const [chess] = useState<Chess>(() => new Chess());
  const [fen, setFen] = useState<string>(chess.fen());
  const [turn, setTurn] = useState<Color>('w');
  const [inCheck, setInCheck] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<Color | 'draw' | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string>('');
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [hintInfo, setHintInfo] = useState<{ from: Square; to: Square } | null>(null);

  // Settings
  const [settings, setSettings] = useState<GameSettings>({
    language: 'vi',
    pieceTheme: 'classic-wood', // defaults to Classic Wood matching the user's reference photo!
    boardTheme: 'rustic-wood',  // defaults to Rustic Wood matching the user's reference photo!
    soundEnabled: true,
    showCoordinates: true,
    showLegalMoves: true,
    showEvaluationBar: true,
    cameraTilt: 'photo'         // defaults to photo angle!
  });

  // Bot & Match Config
  const [selectedBot, setSelectedBot] = useState<BotProfile>(CHESS_COM_BOTS[2]); // Nelson (1300)
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [timeControl, setTimeControl] = useState<TimeControl>('unlimited');
  const [whiteTime, setWhiteTime] = useState<number>(300);
  const [blackTime, setBlackTime] = useState<number>(300);

  // Moves & Stats
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [capturedPieces, setCapturedPieces] = useState<CapturedPieces>({ w: [], b: [] });
  const [evaluation, setEvaluation] = useState<EvaluationState>({ type: 'cp', value: 0 });

  // Modals & UI Drawers
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState<boolean>(false);
  const [isBotModalOpen, setIsBotModalOpen] = useState<boolean>(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState<boolean>(false);
  const [isResignConfirmOpen, setIsResignConfirmOpen] = useState<boolean>(false);

  // 3D Scene Reference
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
    scene.setCameraMode(settings.cameraTilt);
    scene.updateBoard(chess);

    // Callbacks for piece selection and moves
    scene.setCallbacks(
      (square: Square) => handleSquareSelect(square),
      (from: Square, to: Square) => handleMoveAttempt(from, to)
    );

    // Live Stockfish Evaluation
    stockfishEngine.setEvaluationListener((ev) => {
      const mult = chess.turn() === 'w' ? 1 : -1;
      setEvaluation({
        type: ev.type,
        value: ev.value * mult
      });
    });

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

  // 2. Timer Countdown
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
    setGameOverReason(settings.language === 'vi' ? 'Hết giờ thi đấu!' : 'Flagged on time!');
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

  // 4. User Moves or Drops Piece
  const handleMoveAttempt = (from: Square, to: Square) => {
    if (isGameOver || isBotThinking || chess.turn() !== playerColor) return;

    const moves = chess.moves({ square: from, verbose: true });
    const targetMove = moves.find((m) => m.to === to);

    if (targetMove) {
      // Check for promotion
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

      // Play sound
      if (result.captured) {
        sounds.playCapture();
      } else if (result.san.includes('O-O')) {
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

      // Update states
      setFen(chess.fen());
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

      stockfishEngine.evaluatePosition(chess.fen());
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

          setFen(chess.fen());
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

          stockfishEngine.evaluatePosition(chess.fen());
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

    setFen(chess.fen());
    setTurn(chess.turn());
    setInCheck(false);
    setIsGameOver(false);
    setWinner(null);
    setGameOverReason('');
    setMoveHistory([]);
    setCapturedPieces({ w: [], b: [] });
    setEvaluation({ type: 'cp', value: 0 });
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

    setFen(chess.fen());
    setTurn(chess.turn());
    setInCheck(chess.inCheck());
    setMoveHistory((prev) => prev.slice(0, Math.max(0, prev.length - undos)));
    setHintInfo(null);

    // Rebuild captured
    const wCaptures: PieceSymbol[] = [];
    const bCaptures: PieceSymbol[] = [];
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

    stockfishEngine.evaluatePosition(chess.fen());
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

  // Current turn text for bottom bezel (matches reference photo: "1. White's move")
  const currentMoveNumber = Math.floor(moveHistory.length / 2) + 1;
  const currentMoveText = turn === 'w'
    ? t.whitesMoveText.replace('{num}', currentMoveNumber.toString())
    : t.blacksMoveText.replace('{num}', currentMoveNumber.toString());

  const formatClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#140e0a] text-[#ede8e1] select-none font-sans">
      {/* 3D Viewport (Full Screen Canvas) */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full cursor-pointer" />

      {/* Floating Evaluation Bar on Left Edge */}
      {settings.showEvaluationBar && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <EvaluationBar evaluation={evaluation} language={settings.language} />
        </div>
      )}

      {/* TOP-LEFT FLOATING CORNER CONTROLS (matches reference image: Menu ☰ & Flip ↻) */}
      <div className="absolute top-4 left-4 z-30 flex flex-col gap-3">
        {/* Menu Button */}
        <button
          onClick={() => setIsMenuDrawerOpen(true)}
          className="w-11 h-11 rounded-lg bg-[#241a13]/85 hover:bg-[#38281d] border border-[#543c2c]/80 text-[#ede8e1] flex items-center justify-center shadow-2xl backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
          title={t.menu}
        >
          <Menu className="w-6 h-6 text-[#f5ebd9]" />
        </button>

        {/* Flip Board Button */}
        <button
          onClick={handleFlip}
          className="w-11 h-11 rounded-lg bg-[#241a13]/85 hover:bg-[#38281d] border border-[#543c2c]/80 text-[#ede8e1] flex items-center justify-center shadow-2xl backdrop-blur-sm transition-all hover:scale-105 active:scale-95 text-lg font-bold"
          title={t.flipBoard}
        >
          ↻
        </button>
      </div>

      {/* TOP-RIGHT FLOATING CORNER CONTROLS (matches reference image: Undo ↶, Piece theme, Hint 💡) */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-3 items-end">
        {/* Undo Button */}
        <button
          onClick={handleUndo}
          disabled={moveHistory.length === 0 || isBotThinking || isGameOver}
          className="w-11 h-11 rounded-lg bg-[#241a13]/85 hover:bg-[#38281d] border border-[#543c2c]/80 text-[#ede8e1] flex items-center justify-center shadow-2xl backdrop-blur-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-xl font-bold"
          title={t.undo}
        >
          ↶
        </button>

        {/* Piece Theme Toggle (quick toggle between Classic Wood & Liquid Glass!) */}
        <button
          onClick={() => {
            const nextTheme = settings.pieceTheme === 'classic-wood' ? 'liquid-glass' : 'classic-wood';
            setSettings((s) => ({ ...s, pieceTheme: nextTheme }));
          }}
          className="w-11 h-11 rounded-lg bg-[#241a13]/85 hover:bg-[#38281d] border border-[#543c2c]/80 text-[#ede8e1] flex items-center justify-center shadow-2xl backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
          title={settings.pieceTheme === 'classic-wood' ? 'Chuyển sang Thủy Tinh Lỏng' : 'Chuyển sang Gỗ Cổ Điển'}
        >
          <span className="text-xl">
            {settings.pieceTheme === 'classic-wood' ? '♙' : '💎'}
          </span>
        </button>

        {/* Hint Lightbulb Button */}
        <button
          onClick={handleHint}
          disabled={isBotThinking || isGameOver || chess.turn() !== playerColor}
          className="w-11 h-11 rounded-lg bg-[#241a13]/85 hover:bg-[#38281d] border border-[#543c2c]/80 text-[#ede8e1] flex items-center justify-center shadow-2xl backdrop-blur-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          title={t.hint}
        >
          <Lightbulb className="w-5 h-5 text-[#f59e0b]" />
        </button>
      </div>

      {/* Opponent Card Top (Subtle Chess.com style, visible above board) */}
      <div className="absolute top-4 left-20 right-20 z-20 pointer-events-none flex justify-center">
        <div className="pointer-events-auto flex items-center gap-3 px-3.5 py-1.5 rounded-lg bg-[#1f1610]/80 border border-[#3d2b1e] backdrop-blur-sm shadow-lg text-xs">
          <span className="text-xl">{selectedBot.avatar}</span>
          <div>
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>{selectedBot.name}</span>
              <span className="text-[10px] font-mono text-[#f59e0b]">({selectedBot.elo})</span>
            </div>
            <CapturedPiecesView captured={capturedPieces} color={playerColor === 'w' ? 'b' : 'w'} />
          </div>
          {isBotThinking && (
            <span className="text-[11px] font-semibold text-[#f59e0b] animate-pulse flex items-center gap-1 ml-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-ping" />
              {t.botThinking}
            </span>
          )}
          {timeControl !== 'unlimited' && (
            <div className="ml-3 font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/50 text-[#c7b8a7] flex items-center gap-1 border border-[#3d2b1e]">
              <TimerIcon className="w-3 h-3 text-[#f59e0b]" />
              <span>{formatClock(playerColor === 'w' ? blackTime : whiteTime)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Hint Alert Notification */}
      {hintInfo && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-[#1a2e3b]/90 border border-[#38bdf8]/50 text-[#bae6fd] text-xs font-bold px-4 py-1.5 rounded-full shadow-2xl animate-fadeIn flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#38bdf8]" />
          <span>{t.hintMessage.replace('{move}', `${hintInfo.from.toUpperCase()} ➔ ${hintInfo.to.toUpperCase()}`)}</span>
        </div>
      )}

      {/* Check Alert Notification */}
      {inCheck && !isGameOver && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-[#3e1313]/90 border border-[#ef4444]/60 text-[#fca5a5] text-xs font-black px-4 py-1.5 rounded-full shadow-2xl animate-pulse tracking-wide">
          {t.check}
        </div>
      )}

      {/* BOTTOM BEVEL OVERLAY (matches the exact text from reference photo!) */}
      <div className="absolute bottom-2 left-0 right-0 z-20 pointer-events-none flex justify-center px-4">
        <div className="w-full max-w-xl flex items-center justify-between text-xs font-serif tracking-wider uppercase text-[#c2aba0] opacity-85 select-none drop-shadow">
          {/* Left Bevel Text (Bot name & Elo) */}
          <span className="font-bold tracking-widest text-[#d8c2b5]">
            {selectedBot.name.toUpperCase()} LEVEL ({selectedBot.elo})
          </span>

          {/* Right Bevel Text (Turn status: e.g. "1. White's move") */}
          <span className="italic font-sans text-xs tracking-normal lowercase first-letter:uppercase text-[#e6d8ce]">
            {currentMoveText}
          </span>
        </div>
      </div>

      {/* Player Card Bottom (Subtle, next to bottom edge) */}
      <div className="absolute bottom-10 left-4 z-20 pointer-events-none hidden md:block">
        <div className="pointer-events-auto flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#1f1610]/80 border border-[#3d2b1e] backdrop-blur-sm shadow-lg text-xs">
          <span className="text-lg">♔</span>
          <div>
            <div className="font-bold text-white">
              {playerColor === 'w' ? (settings.language === 'vi' ? 'Bạn (Trắng)' : 'You (White)') : (settings.language === 'vi' ? 'Bạn (Đen)' : 'You (Black)')}
            </div>
            <CapturedPiecesView captured={capturedPieces} color={playerColor} />
          </div>
          {timeControl !== 'unlimited' && (
            <div className="ml-2 font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/50 text-[#f59e0b] flex items-center gap-1 border border-[#3d2b1e]">
              <TimerIcon className="w-3 h-3 text-[#f59e0b]" />
              <span>{formatClock(playerColor === 'w' ? whiteTime : blackTime)}</span>
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
