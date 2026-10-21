import React from 'react';
import { CapturedPieces, PieceSymbol } from '../types/chess';

interface CapturedPiecesViewProps {
  captured: CapturedPieces;
  color: 'w' | 'b';
}

const PIECE_SYMBOLS: Record<PieceSymbol, string> = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚'
};

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
};

export const CapturedPiecesView: React.FC<CapturedPiecesViewProps> = ({ captured, color }) => {
  // Captured by this player
  const pieces = color === 'w' ? captured.w : captured.b;

  // Calculate material difference
  const myScore = (color === 'w' ? captured.w : captured.b).reduce((sum, p) => sum + PIECE_VALUES[p], 0);
  const oppScore = (color === 'w' ? captured.b : captured.w).reduce((sum, p) => sum + PIECE_VALUES[p], 0);
  const diff = myScore - oppScore;

  // Sort pieces by standard order: Q, R, B, N, P
  const order: PieceSymbol[] = ['q', 'r', 'b', 'n', 'p'];
  const sorted = [...pieces].sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return (
    <div className="flex items-center gap-1.5 flex-wrap min-h-[24px]">
      <div className="flex items-center -space-x-1">
        {sorted.map((p, idx) => (
          <span
            key={idx}
            className={`text-lg transition-transform hover:scale-125 ${
              color === 'w' ? 'text-amber-100 drop-shadow-[0_2px_4px_rgba(255,255,255,0.3)]' : 'text-neutral-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
            }`}
          >
            {PIECE_SYMBOLS[p]}
          </span>
        ))}
      </div>
      {diff > 0 && (
        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
          +{diff}
        </span>
      )}
    </div>
  );
};
