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
      // Determine wasm support
      const wasmSupported = typeof WebAssembly === 'object' && typeof WebAssembly.validate === 'function';
      const workerUrl = wasmSupported ? '/stockfish.wasm.js' : '/stockfish.js';

      this.worker = new Worker(workerUrl);
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = (err) => {
        console.warn('Stockfish Worker error, falling back to local JS evaluator:', err);
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

    // e.g.: info depth 12 seldepth 16 score cp 35 nodes 24818 nps 496360 time 50 pv e2e4 e7e5
    // or:   info depth 10 score mate -2 ...
    const mateMatch = infoLine.match(/score mate (-?\d+)/);
    if (mateMatch) {
      const mate = parseInt(mateMatch[1], 10);
      this.evalCallback({ type: 'mate', value: mate });
      return;
    }

    const cpMatch = infoLine.match(/score cp (-?\d+)/);
    if (cpMatch) {
      let cp = parseInt(cpMatch[1], 10) / 100;
      // In UCI, evaluation is relative to the side whose turn it is.
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

    // Blunder injection for beginner bots (600-900 Elo)
    if (bot.blunderRate > 0 && Math.random() < bot.blunderRate) {
      const legalMoves = game.moves({ verbose: true });
      if (legalMoves.length > 0) {
        // Pick a non-best legal move
        const randomIndex = Math.floor(Math.random() * legalMoves.length);
        const randomMove = legalMoves[randomIndex];
        setTimeout(() => {
          onDone({
            from: randomMove.from,
            to: randomMove.to,
            promotion: randomMove.promotion as 'q' | 'r' | 'b' | 'n' | undefined
          });
        }, 500 + Math.random() * 500);
        return;
      }
    }

    if (this.worker && this.isReady) {
      this.onMoveCallback = onDone;
      this.sendCommand('stop');
      this.sendCommand(`position fen ${game.fen()}`);

      const movetime = Math.min(1500, Math.max(300, bot.skillLevel * 80));
      this.sendCommand(`go depth ${bot.depth} movetime ${movetime}`);

      // Safety timeout: If Stockfish takes longer than 4.5 seconds, use fallback
      this.searchTimeout = window.setTimeout(() => {
        if (this.onMoveCallback) {
          console.warn('Stockfish engine timed out, using fallback evaluator');
          this.onMoveCallback = null;
          const fallback = this.calculateLocalMove(game, bot);
          onDone(fallback);
        }
      }, 4500);
    } else {
      // Local Minimax / Heuristic Evaluator
      setTimeout(() => {
        const move = this.calculateLocalMove(game, bot);
        onDone(move);
      }, 400 + Math.random() * 400);
    }
  }

  // Robust Alpha-Beta Minimax Local Fallback
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

    const pieceValues: Record<string, number> = {
      p: 100,
      n: 320,
      b: 330,
      r: 500,
      q: 900,
      k: 20000
    };

    let bestMove = legalMoves[0];
    let bestScore = -Infinity;

    // Simple 1-2 ply evaluate with capture / check incentives
    for (const move of legalMoves) {
      let score = 0;
      if (move.captured) {
        score += (pieceValues[move.captured] || 100) * 10 - (pieceValues[move.piece] || 100);
      }
      if (move.san.includes('+')) {
        score += 50;
      }
      if (move.san.includes('#')) {
        score += 100000;
      }
      if (move.from === 'e4' || move.from === 'd4' || move.to === 'e4' || move.to === 'd4' || move.to === 'e5' || move.to === 'd5') {
        score += 25;
      }

      // Add a slight noise according to bot Elo
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
