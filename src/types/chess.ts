import { Square, PieceSymbol, Color } from 'chess.js';

export type { Square, PieceSymbol, Color };

export type Language = 'vi' | 'en';

export type PieceTheme = 'classic-wood' | 'liquid-glass' | 'emerald-jade' | 'cyber-neon';
export type BoardTheme = 'rustic-wood' | 'obsidian-marble' | 'tournament-blue';

export interface BotProfile {
  id: string;
  name: string; // e.g., "Nelson", "Antonio", "Ayanokouji"
  elo: number;
  eloDisplay?: string; // e.g., "+∞" for Ayanokouji Kiyotaka
  category: 'beginner' | 'intermediate' | 'advanced' | 'master';
  avatar: string; // official Chess.com / anime avatar
  avatarBg: string;
  quote: {
    vi: string;
    en: string;
  };
  description: {
    vi: string;
    en: string;
  };
  skillLevel: number; // Stockfish Skill Level 0-20
  depth: number;
  blunderRate: number; // probability of suboptimal move
  personalityTag: string;
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
  moveNumber: number;
}

export interface CapturedPieces {
  w: PieceSymbol[];
  b: PieceSymbol[];
}

export type TimeControl = 'unlimited' | '60' | '180' | '300' | '600';

export interface EvaluationState {
  type: 'cp' | 'mate';
  value: number; // positive = White advantage, negative = Black advantage
}

export interface GameSettings {
  language: Language;
  pieceTheme: PieceTheme;
  boardTheme: BoardTheme;
  soundEnabled: boolean;
  showCoordinates: boolean;
  showLegalMoves: boolean;
  showEvaluationBar: boolean;
  cameraTilt: 'photo' | 'topdown' | 'free3d';
}
