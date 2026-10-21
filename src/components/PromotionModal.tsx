import React from 'react';
import { Color, Language, PieceSymbol } from '../types/chess';

interface PromotionModalProps {
  isOpen: boolean;
  color: Color;
  language: Language;
  onSelectPiece: (piece: PieceSymbol) => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  color,
  onSelectPiece
}) => {
  if (!isOpen) return null;

  const pieces: { type: PieceSymbol; name: string; symbol: string }[] = [
    { type: 'q', name: 'Queen', symbol: color === 'w' ? '♕' : '♛' },
    { type: 'r', name: 'Rook', symbol: color === 'w' ? '♖' : '♜' },
    { type: 'b', name: 'Bishop', symbol: color === 'w' ? '♗' : '♝' },
    { type: 'n', name: 'Knight', symbol: color === 'w' ? '♘' : '♞' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="w-full max-w-xs bg-[#262421] rounded-xl border border-white/12 p-4 shadow-2xl text-center">
        <h3 className="text-sm font-bold text-white mb-3">
          Promote Pawn
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {pieces.map((p) => (
            <button
              key={p.type}
              onClick={() => onSelectPiece(p.type)}
              className="p-2.5 rounded-lg bg-[#312e2b] hover:bg-[#3d3935] border border-white/10 hover:border-[#81b64c] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95"
            >
              <span className="text-3xl text-white leading-none">{p.symbol}</span>
              <span className="text-[11px] font-semibold text-[#c8c5c0]">{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
