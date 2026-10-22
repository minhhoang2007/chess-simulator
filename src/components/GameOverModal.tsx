import React from 'react';
import { BotProfile, Color } from '../types/chess';
import { RotateCcw, Users, Trophy, Flag, Eye, X } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  winner: Color | 'draw' | null;
  reason: string;
  playerColor: Color;
  selectedBot: BotProfile;
  moveCount: number;
  onRematch: () => void;
  onSelectBot: () => void;
  onClose: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winner,
  reason,
  playerColor,
  selectedBot,
  moveCount,
  onRematch,
  onSelectBot,
  onClose
}) => {
  if (!isOpen) return null;

  const isPlayerWinner = winner === playerColor;
  const isDraw = winner === 'draw';

  // Banner colors & text
  const bannerBg = isPlayerWinner
    ? 'bg-gradient-to-r from-[#427c36] via-[#529344] to-[#427c36]'
    : isDraw
    ? 'bg-gradient-to-r from-[#3c3935] via-[#48443f] to-[#3c3935]'
    : 'bg-gradient-to-r from-[#b32b28] via-[#ca3431] to-[#b32b28]';

  const titleText = isPlayerWinner
    ? 'You Won!'
    : isDraw
    ? 'Draw'
    : `${selectedBot.name} Won!`;

  const reasonText = reason ? `by ${reason}` : 'Game Over';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in select-none">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#262421] border border-white/12 shadow-[0_24px_64px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col">
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-black/35 hover:bg-black/55 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          title="Review Board"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. Result banner */}
        <div className={`pt-6 pb-5 px-6 text-center text-white relative shadow-md ${bannerBg}`}>
          <div className="flex items-center justify-center gap-2 mb-1">
            {isPlayerWinner ? (
              <Trophy className="w-6 h-6 text-[#ffd54f] drop-shadow-sm" />
            ) : isDraw ? (
              <Flag className="w-5 h-5 text-white/85" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-white/20 border border-white/40 flex items-center justify-center font-black text-sm text-white">
                #
              </div>
            )}
            <h2 className="text-xl font-extrabold tracking-tight drop-shadow-sm">{titleText}</h2>
          </div>
          <p className="text-xs font-semibold tracking-wide text-white/90 uppercase">{reasonText}</p>
        </div>

        {/* 2. Matchup & Score Card */}
        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#211f1c] border border-white/6">
            {/* Player */}
            <div className="flex flex-col items-center text-center p-2 rounded-lg bg-[#272522]">
              <div className="relative mb-2">
                <div className="w-12 h-12 rounded-full bg-[#3d3a36] border-2 border-white/20 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                  {playerColor === 'w' ? '♔' : '♚'}
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border border-[#211f1c] shadow-sm ${
                    isPlayerWinner ? 'bg-[#81b64c] text-white' : isDraw ? 'bg-[#73716e] text-white' : 'bg-[#e53935] text-white'
                  }`}
                >
                  {isPlayerWinner ? '1' : isDraw ? '½' : '0'}
                </div>
              </div>
              <span className="text-xs font-bold text-white">You</span>
              <span className="text-[10px] text-[#9e9b95] font-medium">Player</span>
            </div>

            {/* Bot */}
            <div className="flex flex-col items-center text-center p-2 rounded-lg bg-[#272522]">
              <div className="relative mb-2">
                <img
                  src={selectedBot.avatar}
                  alt={selectedBot.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/20 shadow-inner"
                />
                <div
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border border-[#211f1c] shadow-sm ${
                    !isPlayerWinner && !isDraw
                      ? 'bg-[#81b64c] text-white'
                      : isDraw
                      ? 'bg-[#73716e] text-white'
                      : 'bg-[#e53935] text-white'
                  }`}
                >
                  {!isPlayerWinner && !isDraw ? '1' : isDraw ? '½' : '0'}
                </div>
              </div>
              <span className="text-xs font-bold text-white leading-tight">{selectedBot.name}</span>
              <span className="text-[10px] text-[#9e9b95] font-medium">{selectedBot.eloDisplay || selectedBot.elo} Elo</span>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#211f1c] text-[11px] text-[#9e9b95]">
            <span>Moves: <strong className="text-white">{moveCount}</strong></span>
            <span>Opponent: <strong className="text-white">{selectedBot.name}</strong></span>
          </div>

          {/* 3. Action buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={onRematch}
              className="w-full py-3 rounded-xl bg-[#81b64c] hover:bg-[#73a540] active:scale-[0.98] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(129,182,76,0.35)] transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.5]" />
              Rematch
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onSelectBot}
                className="py-2.5 rounded-xl bg-[#312e2b] hover:bg-[#3d3935] active:scale-[0.98] text-[#e2ded9] hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/8 transition-all cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                Change Bot
              </button>

              <button
                onClick={onClose}
                className="py-2.5 rounded-xl bg-[#312e2b] hover:bg-[#3d3935] active:scale-[0.98] text-[#e2ded9] hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/8 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                Review Board
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
