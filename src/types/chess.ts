import { Square, PieceSymbol, Color } from 'chess.js';

export type { Square, PieceSymbol, Color };

export type Language = 'vi' | 'en';

export type PieceTheme = 'liquid-glass' | 'classic-wood' | 'emerald-jade' | 'cyber-neon';
export type BoardTheme = 'rustic-wood' | 'obsidian-marble' | 'tournament-blue';

export interface BotProfile {
  id: string;
  elo: number;
  name: {
    vi: string;
    en: string;
  };
  title: {
    vi: string;
    en: string;
  };
  description: {
    vi: string;
    en: string;
  };
  avatar: string;
  skillLevel: number; // Stockfish Skill Level 0-20
  depth: number;
  blunderRate: number; // 0.0 to 1.0
  personality: {
    vi: string;
    en: string;
  };
}

export interface MoveRecord {
  san: string;
  from: Square;
  to: Square;
  color: Color;
  piece: PieceSymbol;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
  fen: string;
  timeTaken?: number;
}

export interface CapturedPieces {
  w: PieceSymbol[];
  b: PieceSymbol[];
}

export type TimeControl = 'unlimited' | '60' | '180' | '300' | '600';

export interface EvaluationState {
  type: 'cp' | 'mate';
  value: number; // positive = White advantage, negative = Black advantage
  depth?: number;
}

export interface GameSettings {
  language: Language;
  pieceTheme: PieceTheme;
  boardTheme: BoardTheme;
  soundEnabled: boolean;
  showCoordinates: boolean;
  showLegalMoves: boolean;
  showBestMoveHint: boolean;
  autoRotateOnTurn: boolean;
  cameraView: 'perspective' | 'topdown' | 'white' | 'black';
}
