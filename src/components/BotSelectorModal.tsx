import React from 'react';
import { BotProfile, Color, Language, TimeControl } from '../types/chess';
import { CHESS_COM_BOTS, TRANSLATIONS } from '../locales/i18n';
import { Swords, Timer, Zap, X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#1f1915] text-[#ede8e1] rounded-xl border border-[#4a3b32] shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3d2e25] bg-[#17120e]">
          <div>
            <h2 className="text-lg font-bold tracking-wide text-[#f5ebd9] uppercase">
              {t.selectBotTitle}
            </h2>
            <p className="text-xs text-[#a89a8e]">
              {language === 'vi' ? 'Chọn đối thủ mô phỏng chuẩn Chess.com (600 - 2200 Elo)' : 'Authentic Chess.com bot personalities & ratings'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9e8f83] hover:text-white hover:bg-[#2b211a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bots List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {CHESS_COM_BOTS.map((bot) => {
              const isSelected = selectedBot.id === bot.id;
              return (
                <div
                  key={bot.id}
                  onClick={() => onSelectBot(bot)}
                  className={`cursor-pointer p-3.5 rounded-lg border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#3b2b1f] border-[#d97706] shadow-md ring-1 ring-[#d97706]'
                      : 'bg-[#18130f] border-[#382b22] hover:border-[#6b5344] hover:bg-[#211a14]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl">{bot.avatar}</span>
                        <div>
                          <h3 className="font-bold text-white text-base leading-tight">
                            {bot.name}
                          </h3>
                          <span className="text-[11px] font-mono font-semibold text-[#f59e0b]">
                            {bot.elo} ELO
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#2b2119] text-[#c7b8a7] border border-[#443428]">
                        {bot.personalityTag}
                      </span>
                    </div>

                    <p className="text-xs text-[#b8a99c] line-clamp-2 leading-relaxed mb-3">
                      {bot.description[language]}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#2e231b] text-[11px] italic text-[#d4af37]">
                    &ldquo;{bot.quote[language]}&rdquo;
                  </div>
                </div>
              );
            })}
          </div>

          {/* Color & Time Control */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#382b22]">
            {/* Color */}
            <div className="p-3.5 rounded-lg bg-[#18130f] border border-[#382b22]">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#a89a8e] mb-2.5 flex items-center gap-2">
                <Swords className="w-4 h-4 text-[#f59e0b]" />
                <span>{language === 'vi' ? 'Bên Cầm Quân' : 'Choose Side'}</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectColor('w')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border font-semibold text-xs transition-all ${
                    selectedColor === 'w'
                      ? 'bg-[#f5ebd9] text-[#1c140e] border-[#f5ebd9] shadow'
                      : 'bg-[#241c16] text-[#c7b8a7] border-[#3d2e25] hover:bg-[#2d231c]'
                  }`}
                >
                  <span className="text-lg">♔</span>
                  <span>{t.playAsWhite}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectColor('b')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border font-semibold text-xs transition-all ${
                    selectedColor === 'b'
                      ? 'bg-[#2b1f17] text-[#f59e0b] border-[#f59e0b] shadow'
                      : 'bg-[#241c16] text-[#c7b8a7] border-[#3d2e25] hover:bg-[#2d231c]'
                  }`}
                >
                  <span className="text-lg">♚</span>
                  <span>{t.playAsBlack}</span>
                </button>
              </div>
            </div>

            {/* Time */}
            <div className="p-3.5 rounded-lg bg-[#18130f] border border-[#382b22]">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#a89a8e] mb-2.5 flex items-center gap-2">
                <Timer className="w-4 h-4 text-[#f59e0b]" />
                <span>{t.timeControl}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'unlimited', label: t.unlimitedTime },
                  { id: '180', label: '3 min' },
                  { id: '300', label: '5 min' },
                  { id: '600', label: '10 min' },
                  { id: '60', label: '1 min' }
                ].map((tc) => (
                  <button
                    key={tc.id}
                    type="button"
                    onClick={() => onSelectTimeControl(tc.id as TimeControl)}
                    className={`py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                      timeControl === tc.id
                        ? 'bg-[#4a3424] text-[#f59e0b] border-[#d97706]'
                        : 'bg-[#241c16] text-[#c7b8a7] border-[#3d2e25] hover:bg-[#2d231c]'
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
        <div className="px-6 py-3.5 border-t border-[#382b22] bg-[#17120e] flex items-center justify-between">
          <div className="text-xs text-[#a89a8e]">
            {language === 'vi'
              ? `Đang chọn: ${selectedBot.name} (${selectedBot.elo} Elo)`
              : `Playing vs ${selectedBot.name} (${selectedBot.elo} Elo)`}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#4a3b32] text-xs font-medium text-[#c7b8a7] hover:bg-[#2b2119] transition-colors"
            >
              {t.close}
            </button>
            <button
              onClick={onStartGame}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[#b45309] hover:bg-[#d97706] text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>{t.startGame}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
