import React from 'react';
import { Color, Language, PieceSymbol } from '../types/chess';
import { TRANSLATIONS } from '../locales/i18n';
import { Crown, Shield, Crosshair, Sparkles } from 'lucide-react';

interface PromotionModalProps {
  isOpen: boolean;
  color: Color;
  language: Language;
  onSelectPiece: (piece: PieceSymbol) => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  color,
  language,
  onSelectPiece
}) => {
  if (!isOpen) return null;
  const t = TRANSLATIONS[language];

  const pieces: { type: PieceSymbol; name: string; symbol: string; icon: React.ReactNode }[] = [
    { type: 'q', name: t.queen, symbol: color === 'w' ? '♕' : '♛', icon: <Crown className="w-6 h-6 text-amber-300" /> },
    { type: 'r', name: t.rook, symbol: color === 'w' ? '♖' : '♜', icon: <Shield className="w-6 h-6 text-sky-300" /> },
    { type: 'b', name: t.bishop, symbol: color === 'w' ? '♗' : '♝', icon: <Crosshair className="w-6 h-6 text-emerald-300" /> },
    { type: 'n', name: t.knight, symbol: color === 'w' ? '♘' : '♞', icon: <Sparkles className="w-6 h-6 text-purple-300" /> }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md glass-panel rounded-2xl border border-white/20 p-6 shadow-2xl text-center">
        <h3 className="text-xl font-bold font-serif-luxury text-white mb-1">
          {t.promoteTitle}
        </h3>
        <p className="text-xs text-neutral-400 mb-6">
          {language === 'vi' ? 'Chọn quân cờ bạn muốn biến hóa thành:' : 'Choose a piece to promote to:'}
        </p>

        <div className="grid grid-cols-2 gap-4">
          {pieces.map((p) => (
            <button
              key={p.type}
              onClick={() => onSelectPiece(p.type)}
              className="group p-4 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-400/80 hover:bg-amber-400/10 transition-all flex flex-col items-center justify-center gap-2 hover:scale-105 active:scale-95"
            >
              <span className="text-5xl group-hover:scale-110 transition-transform">
                {p.symbol}
              </span>
              <span className="text-sm font-semibold text-neutral-200 group-hover:text-amber-300">
                {p.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
