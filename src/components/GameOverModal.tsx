import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { BotProfile, Color, Language } from '../types/chess';
import { TRANSLATIONS } from '../locales/i18n';
import { Trophy, Frown, Handshake, RotateCcw, Users } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  winner: Color | 'draw' | null;
  reason: string;
  playerColor: Color;
  bot: BotProfile;
  language: Language;
  onRematch: () => void;
  onChangeBot: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winner,
  reason,
  playerColor,
  bot,
  language,
  onRematch,
  onChangeBot
}) => {
  if (!isOpen) return null;
  const t = TRANSLATIONS[language];

  const isPlayerWinner = winner === playerColor;
  const isDraw = winner === 'draw';

  useEffect(() => {
    if (isPlayerWinner) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isPlayerWinner]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md glass-panel rounded-2xl border border-white/20 p-6 shadow-2xl text-center">
        {/* Icon */}
        <div className="inline-flex p-4 rounded-2xl mb-4 bg-white/5 border border-white/10">
          {isPlayerWinner ? (
            <Trophy className="w-12 h-12 text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
          ) : isDraw ? (
            <Handshake className="w-12 h-12 text-sky-400" />
          ) : (
            <Frown className="w-12 h-12 text-rose-400" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black font-serif-luxury text-white mb-2">
          {isPlayerWinner ? t.youWon : isDraw ? t.gameDraw : t.youLost}
        </h2>

        {/* Reason */}
        <p className="text-sm text-neutral-300 font-medium mb-1">
          {reason}
        </p>
        <p className="text-xs text-neutral-400 mb-6">
          {language === 'vi'
            ? `Trận đấu với ${bot.name} (${bot.elo} Elo)`
            : `Match vs ${bot.name} (${bot.elo} Elo)`}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRematch}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.restartMatch}</span>
          </button>
          <button
            onClick={onChangeBot}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/15 transition-all"
          >
            <Users className="w-4 h-4" />
            <span>{t.changeBot}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
