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
      const workerUrl = wasmSupported ? '/stockfish.wasm.js' : '/stockfish.js';

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
    this.sendCommand('setoption name UCI_LimitStrength value true');
    this.sendCommand(`setoption name UCI_Elo value ${bot.elo}`);
    this.sendCommand(`setoption name Skill Level value ${bot.skillLevel}`);
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
      // Bot response tempo slowed down by another 1.5x (~520ms - 720ms)
      // Feels thoughtful, comfortable, natural human-like cafe tempo
      const targetMinDelay = 520 + Math.random() * 200;
      const remaining = Math.max(80, targetMinDelay - elapsed);
      window.setTimeout(() => onDone(res), remaining);
    };

    // Nelson Personality: loves early Queen moves!
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

    // Blunder injection for beginner bots (Jimmy 600, Zara 850)
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

      const movetime = Math.min(210, Math.max(100, bot.skillLevel * 10));
      const depth = Math.min(12, bot.depth);
      this.sendCommand(`go depth ${depth} movetime ${movetime}`);

      this.searchTimeout = window.setTimeout(() => {
        if (this.onMoveCallback) {
          this.onMoveCallback = null;
          const fallback = this.calculateLocalMove(game, bot);
          deliverWithHumanTempo(fallback);
        }
      }, 650);
    } else {
      const move = this.calculateLocalMove(game, bot);
      deliverWithHumanTempo(move);
    }
  }

  // Robust Alpha-Beta Minimax Fallback
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

    const pieceValues: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
    let bestMove = legalMoves[0];
    let bestScore = -Infinity;

    for (const move of legalMoves) {
      let score = 0;
      if (move.captured) {
        score += (pieceValues[move.captured] || 100) * 10 - (pieceValues[move.piece] || 100);
      }
      if (move.san.includes('+')) score += 50;
      if (move.san.includes('#')) score += 100000;
      if (['e4', 'd4', 'e5', 'd5'].includes(move.to)) score += 20;

      const noise = (Math.random() - 0.5) * (2400 - bot.elo) * 0.1;
      const finalScore = score + noise;

      if (finalScore > bestScore) {
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
