import React from 'react';
import { BotProfile, Color, Language, TimeControl } from '../types/chess';
import { CHESS_COM_BOTS } from '../locales/i18n';
import { X } from 'lucide-react';

interface BotSelectorModalProps {
  isOpen: boolean;
  selectedBot: BotProfile;
  selectedColor: Color;
  timeControl: TimeControl;
  language: Language;
  onSelectBot: (bot: BotProfile) => void;
  onSelectColor: (color: Color) => void;
  onSelectTimeControl: (tc: TimeControl) => void;
  onStartGame: () => void;
  onClose: () => void;
}

export const BotSelectorModal: React.FC<BotSelectorModalProps> = ({
  isOpen,
  selectedBot,
  selectedColor,
  timeControl,
  onSelectBot,
  onSelectColor,
  onSelectTimeControl,
  onStartGame,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans select-none">
      <div className="relative w-full max-w-md bg-[#262421] text-[#f1f1f1] rounded-xl border border-white/12 shadow-[0_24px_64px_rgba(0,0,0,0.75)] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#1f1e1b] border-b border-white/8">
          <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            <span>♟️</span>
            <span>Play vs Bot</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9e9b95] hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Bot Spotlight (Chess.com style) */}
        <div className="px-5 py-3.5 bg-[#21201d] border-b border-white/8 flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-xl bg-[#2b2926] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src={selectedBot.avatar}
              alt={selectedBot.name}
              className="w-12 h-12 object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white">{selectedBot.name}</span>
              <span className="px-1.5 py-0.5 rounded bg-[#2b2926] text-xs font-bold text-[#81b64c] border border-white/8">
                {selectedBot.elo}
              </span>
              <span className="text-[11px] font-medium text-[#9e9b95]">
                • {selectedBot.personalityTag}
              </span>
            </div>
            <p className="text-xs text-[#b8b5b0] mt-0.5 leading-snug line-clamp-1 italic">
              &ldquo;{selectedBot.quote.en}&rdquo;
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-3.5 max-h-[60vh] overflow-y-auto">
          {/* Choose Bot Rating Grid */}
          <div>
            <div className="text-xs font-semibold text-[#9e9b95] mb-2">
              Choose Opponent
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CHESS_COM_BOTS.map((bot) => {
                const isSelected = selectedBot.id === bot.id;
                return (
                  <button
                    key={bot.id}
                    type="button"
                    onClick={() => onSelectBot(bot)}
                    className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-[#363330] border-[#81b64c] ring-1 ring-[#81b64c]'
                        : 'bg-[#2b2926] border-white/8 hover:bg-[#312e2b] hover:border-white/16'
                    }`}
                  >
                    <img
                      src={bot.avatar}
                      alt={bot.name}
                      className="w-8 h-8 object-contain shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {bot.name}
                      </div>
                      <div className="text-[11px] font-semibold text-[#81b64c]">
                        {bot.elo}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Play As & Time Control Row */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Play As */}
            <div>
              <div className="text-xs font-semibold text-[#9e9b95] mb-1.5">
                I Play As
              </div>
              <div className="grid grid-cols-2 gap-1.5 bg-[#191815] p-1 rounded-lg border border-white/8">
                <button
                  type="button"
                  onClick={() => onSelectColor('w')}
                  className={`py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedColor === 'w'
                      ? 'bg-white text-[#191815] shadow-xs'
                      : 'text-[#9e9b95] hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-xs bg-white border border-black/30 inline-block" />
                  <span>White</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectColor('b')}
                  className={`py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedColor === 'b'
                      ? 'bg-[#312e2b] text-white border border-white/20 shadow-xs'
                      : 'text-[#9e9b95] hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#141311] border border-white/40 inline-block" />
                  <span>Black</span>
                </button>
              </div>
            </div>

            {/* Time Control */}
            <div>
              <div className="text-xs font-semibold text-[#9e9b95] mb-1.5">
                Time Control
              </div>
              <select
                value={timeControl}
                onChange={(e) => onSelectTimeControl(e.target.value as TimeControl)}
                className="w-full h-[36px] px-2.5 rounded-lg bg-[#191815] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#81b64c] cursor-pointer"
              >
                <option value="unlimited">No Clock (Chill)</option>
                <option value="600">10 min (Rapid)</option>
                <option value="300">5 min (Blitz)</option>
                <option value="180">3 min (Blitz)</option>
                <option value="60">1 min (Bullet)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-3.5 bg-[#1f1e1b] border-t border-white/8">
          <button
            type="button"
            onClick={onStartGame}
            className="w-full py-3 rounded-lg bg-[#81b64c] hover:bg-[#91c859] active:bg-[#73a542] text-white font-bold text-sm tracking-wide shadow-[0_4px_0_#537a2d] active:translate-y-0.5 transition-all cursor-pointer"
          >
            Play
          </button>
        </div>
      </div>
    </div>
  );
};
