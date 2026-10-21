import React from 'react';
import { BotProfile, Color, Language, TimeControl } from '../types/chess';
import { BOT_PROFILES, TRANSLATIONS } from '../locales/i18n';
import { Bot, Swords, Timer, Zap, X } from 'lucide-react';

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
  language,
  onSelectBot,
  onSelectColor,
  onSelectTimeControl,
  onStartGame,
  onClose
}) => {
  if (!isOpen) return null;
  const t = TRANSLATIONS[language];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col glass-panel rounded-2xl border border-white/15 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-400/30">
              <Bot className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif-luxury tracking-wide text-white">
                {t.selectBot}
              </h2>
              <p className="text-xs text-neutral-400">
                Stockfish Engine AI • 600 - 2200 Elo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Bots Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {BOT_PROFILES.map((bot) => {
              const isSelected = selectedBot.id === bot.id;
              return (
                <div
                  key={bot.id}
                  onClick={() => onSelectBot(bot)}
                  className={`cursor-pointer p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400/80 shadow-[0_0_24px_rgba(245,158,11,0.25)] scale-[1.02]'
                      : 'bg-white/[0.03] border-white/10 hover:border-white/25 hover:bg-white/[0.06]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-4xl filter drop-shadow">{bot.avatar}</div>
                      <div className="text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                          {bot.elo} {t.elo}
                        </span>
                        <div className="text-[11px] text-neutral-400 mt-1">
                          {bot.title[language]}
                        </div>
                      </div>
                    </div>

                    <h3 className="font-bold text-white text-base mb-1">
                      {bot.name[language]}
                    </h3>
                    <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed mb-3">
                      {bot.description[language]}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5 text-[11px] italic text-amber-200/80">
                    &ldquo;{bot.personality[language]}&rdquo;
                  </div>
                </div>
              );
            })}
          </div>

          {/* Color & Time Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Color Choice */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
                <Swords className="w-4 h-4 text-amber-400" />
                <span>{language === 'vi' ? 'Chọn Bên Cầm Quân' : 'Choose Side'}</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onSelectColor('w')}
                  className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border font-medium text-sm transition-all ${
                    selectedColor === 'w'
                      ? 'bg-white text-neutral-900 border-white shadow-lg'
                      : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span className="text-xl">♔</span>
                  <span>{t.playAsWhite}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectColor('b')}
                  className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border font-medium text-sm transition-all ${
                    selectedColor === 'b'
                      ? 'bg-neutral-800 text-amber-300 border-amber-400 shadow-lg'
                      : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span className="text-xl">♚</span>
                  <span>{t.playAsBlack}</span>
                </button>
              </div>
            </div>

            {/* Time Control */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-400" />
                <span>{t.timeControl}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'unlimited', label: t.unlimitedTime },
                  { id: '180', label: '3 min (Blitz)' },
                  { id: '300', label: '5 min (Blitz)' },
                  { id: '600', label: '10 min (Rapid)' },
                  { id: '60', label: '1 min (Bullet)' }
                ].map((tc) => (
                  <button
                    key={tc.id}
                    type="button"
                    onClick={() => onSelectTimeControl(tc.id as TimeControl)}
                    className={`py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                      timeControl === tc.id
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400'
                        : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div className="text-xs text-neutral-400 hidden sm:block">
            {language === 'vi'
              ? `Đối đầu ${selectedBot.name.vi} (${selectedBot.elo} Elo)`
              : `Challenging ${selectedBot.name.en} (${selectedBot.elo} Elo)`}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-white/15 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              {t.close}
            </button>
            <button
              onClick={onStartGame}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-7 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="w-4 h-4 fill-neutral-950" />
              <span>{t.startGame}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
