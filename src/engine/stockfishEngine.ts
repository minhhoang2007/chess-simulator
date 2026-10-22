import { Chess, Square } from 'chess.js';
import { BotProfile, EvaluationState } from '../types/chess';

export interface BestMoveResult {
  from: Square;
  to: Square;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export type EvalCallback = (evalState: EvaluationState) => void;

class StockfishEngineService {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private onReadyCallbacks: (() => void)[] = [];
  private onMoveCallback: ((result: BestMoveResult) => void) | null = null;
  private evalCallback: EvalCallback | null = null;
  private currentBot: BotProfile | null = null;
  private searchTimeout: number | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined') return;

    try {
      const wasmSupported = typeof WebAssembly === 'object' && typeof WebAssembly.validate === 'function';
      const workerUrl = wasmSupported ? `${import.meta.env.BASE_URL}stockfish.wasm.js` : `${import.meta.env.BASE_URL}stockfish.js`;

      this.worker = new Worker(workerUrl);
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = (err) => {
        console.warn('Stockfish Worker error, using local engine:', err);
        this.worker = null;
        this.isReady = true;
        this.flushReadyCallbacks();
      };

      this.sendCommand('uci');
    } catch (e) {
      console.warn('Stockfish worker initialization failed, using local engine:', e);
      this.worker = null;
      this.isReady = true;
      this.flushReadyCallbacks();
    }
  }

  private flushReadyCallbacks() {
    while (this.onReadyCallbacks.length > 0) {
      const cb = this.onReadyCallbacks.shift();
      if (cb) cb();
    }
  }

  private sendCommand(cmd: string) {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  private handleWorkerMessage(e: MessageEvent) {
    const line = typeof e.data === 'string' ? e.data : '';

    if (line === 'uciok') {
      this.sendCommand('isready');
    } else if (line === 'readyok') {
      this.isReady = true;
      this.flushReadyCallbacks();
    } else if (line.startsWith('info') && line.includes('score')) {
      this.parseEvaluation(line);
    } else if (line.startsWith('bestmove')) {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = null;
      }
      const parts = line.split(' ');
      const moveStr = parts[1];
      if (moveStr && moveStr !== '(none)' && this.onMoveCallback) {
        const from = moveStr.substring(0, 2) as Square;
        const to = moveStr.substring(2, 4) as Square;
        const promotion = moveStr.length > 4 ? (moveStr[4] as 'q' | 'r' | 'b' | 'n') : undefined;

        const cb = this.onMoveCallback;
        this.onMoveCallback = null;
        cb({ from, to, promotion });
      }
    }
  }

  private parseEvaluation(infoLine: string) {
    if (!this.evalCallback) return;

    const mateMatch = infoLine.match(/score mate (-?\d+)/);
    if (mateMatch) {
      const mate = parseInt(mateMatch[1], 10);
      this.evalCallback({ type: 'mate', value: mate });
      return;
    }

    const cpMatch = infoLine.match(/score cp (-?\d+)/);
    if (cpMatch) {
      const cp = parseInt(cpMatch[1], 10) / 100;
      this.evalCallback({ type: 'cp', value: cp });
    }
  }

  public setEvaluationListener(cb: EvalCallback | null) {
    this.evalCallback = cb;
  }

  public configureBot(bot: BotProfile) {
    this.currentBot = bot;
    if (!this.worker) return;

    this.sendCommand('stop');
    if (bot.elo >= 2500) {
      // Full Stockfish strength for the strongest bots
      this.sendCommand('setoption name UCI_LimitStrength value false');
      this.sendCommand(`setoption name Skill Level value ${bot.skillLevel}`);
    } else {
      this.sendCommand('setoption name UCI_LimitStrength value true');
      this.sendCommand(`setoption name UCI_Elo value ${Math.min(2850, Math.max(800, bot.elo))}`);
      this.sendCommand(`setoption name Skill Level value ${bot.skillLevel}`);
    }
    this.sendCommand('isready');
  }

  public evaluatePosition(fen: string) {
    if (!this.worker) return;
    this.sendCommand('stop');
    this.sendCommand(`position fen ${fen}`);
    this.sendCommand('go depth 10');
  }

  public getBestMove(game: Chess, bot: BotProfile, onDone: (result: BestMoveResult) => void) {
    this.configureBot(bot);
    const startTime = performance.now();

    const deliverWithHumanTempo = (res: BestMoveResult) => {
      const elapsed = performance.now() - startTime;
      // Bot response delay (~520-720ms)
      const targetMinDelay = 520 + Math.random() * 200;
      const remaining = Math.max(80, targetMinDelay - elapsed);
      window.setTimeout(() => onDone(res), remaining);
    };

    // Nelson likes early queen moves
    if (bot.id === 'nelson' && game.history().length < 6) {
      const legalMoves = game.moves({ verbose: true });
      const queenMove = legalMoves.find((m) => m.piece === 'q');
      if (queenMove && Math.random() < 0.65) {
        deliverWithHumanTempo({
          from: queenMove.from,
          to: queenMove.to,
          promotion: queenMove.promotion as 'q' | 'r' | 'b' | 'n' | undefined
        });
        return;
      }
    }

    // Blunder injection for beginner bots
    if (bot.blunderRate > 0 && Math.random() < bot.blunderRate) {
      const legalMoves = game.moves({ verbose: true });
      if (legalMoves.length > 0) {
        const randomIndex = Math.floor(Math.random() * legalMoves.length);
        const randomMove = legalMoves[randomIndex];
        deliverWithHumanTempo({
          from: randomMove.from,
          to: randomMove.to,
          promotion: randomMove.promotion as 'q' | 'r' | 'b' | 'n' | undefined
        });
        return;
      }
    }

    if (this.worker && this.isReady) {
      this.onMoveCallback = (res) => deliverWithHumanTempo(res);
      this.sendCommand('stop');
      this.sendCommand(`position fen ${game.fen()}`);

      const movetime =
        bot.elo >= 3000
          ? 850
          : bot.elo >= 2500
          ? 600
          : bot.elo >= 2000
          ? 420
          : Math.min(320, Math.max(120, bot.skillLevel * 18));
      const depth = Math.min(20, Math.max(2, bot.depth));
      this.sendCommand(`go depth ${depth} movetime ${movetime}`);

      this.searchTimeout = window.setTimeout(() => {
        if (this.onMoveCallback) {
          this.onMoveCallback = null;
          const fallback = this.calculateLocalMove(game, bot);
          deliverWithHumanTempo(fallback);
        }
      }, movetime + 1200);
    } else {
      const move = this.calculateLocalMove(game, bot);
      deliverWithHumanTempo(move);
    }
  }

  // Robust Alpha-Beta Minimax Fallback scaled by Bot ELO
  private evaluateBoard(game: Chess): number {
    if (game.isCheckmate()) {
      return game.turn() === 'w' ? -99999 : 99999;
    }
    if (game.isDraw()) return 0;

    const pieceValues: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
    const board = game.board();
    let score = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p) continue;
        let val = pieceValues[p.type] || 0;
        // Center control & advancement bonus
        const centerDist = Math.abs(3.5 - r) + Math.abs(3.5 - c);
        if (p.type === 'n' || p.type === 'b' || p.type === 'p') {
          val += Math.round((7 - centerDist) * 4);
        }
        if (p.type === 'p') {
          const adv = p.color === 'w' ? 6 - r : r - 1;
          val += adv * 8;
        }
        score += p.color === 'w' ? val : -val;
      }
    }
    return score;
  }

  private minimax(
    game: Chess,
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean
  ): number {
    if (depth === 0 || game.isGameOver()) {
      return this.evaluateBoard(game);
    }

    const moves = game.moves({ verbose: true });
    // Order captures first for faster alpha-beta pruning
    moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));

    if (maximizingPlayer) {
      let maxEval = -Infinity;
      for (const m of moves) {
        game.move(m);
        const ev = this.minimax(game, depth - 1, alpha, beta, false);
        game.undo();
        if (ev > maxEval) maxEval = ev;
        if (ev > alpha) alpha = ev;
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        game.move(m);
        const ev = this.minimax(game, depth - 1, alpha, beta, true);
        game.undo();
        if (ev < minEval) minEval = ev;
        if (ev < beta) beta = ev;
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  private calculateLocalMove(game: Chess, bot: BotProfile): BestMoveResult {
    const legalMoves = game.moves({ verbose: true });
    if (legalMoves.length === 0) {
      return { from: 'e7', to: 'e8' };
    }
    if (legalMoves.length === 1) {
      return {
        from: legalMoves[0].from,
        to: legalMoves[0].to,
        promotion: legalMoves[0].promotion as 'q' | 'r' | 'b' | 'n' | undefined
      };
    }

    const clone = new Chess(game.fen());
    const isWhite = clone.turn() === 'w';
    const searchDepth = bot.elo >= 2200 ? 3 : bot.elo >= 1400 ? 2 : 1;
    const noiseAmplitude = Math.max(0, (2300 - bot.elo) * 0.08);

    // Order captures/checks first
    legalMoves.sort((a, b) => (b.captured ? 10 : 0) - (a.captured ? 10 : 0));

    let bestMove = legalMoves[0];
    let bestScore = isWhite ? -Infinity : Infinity;

    for (const move of legalMoves) {
      clone.move(move);
      const rawScore = this.minimax(clone, searchDepth - 1, -Infinity, Infinity, !isWhite);
      clone.undo();

      const noise = (Math.random() - 0.5) * noiseAmplitude;
      const finalScore = rawScore + noise;

      if (isWhite ? finalScore > bestScore : finalScore < bestScore) {
        bestScore = finalScore;
        bestMove = move;
      }
    }

    return {
      from: bestMove.from,
      to: bestMove.to,
      promotion: bestMove.promotion as 'q' | 'r' | 'b' | 'n' | undefined
    };
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export const stockfishEngine = new StockfishEngineService();
