import React from 'react';
import { BotProfile, GameSettings, Language, MoveRecord, PieceTheme, BoardTheme } from '../types/chess';
import { TRANSLATIONS } from '../locales/i18n';
import {
  X,
  PlusCircle,
  RotateCcw,
  Flag,
  Volume2,
  VolumeX,
  Compass,
  Layers,
  Sparkles,
  BarChart2,
  Eye,
  Globe
} from 'lucide-react';

interface MenuDrawerProps {
  isOpen: boolean;
  bot: BotProfile;
  settings: GameSettings;
  moveHistory: MoveRecord[];
  language: Language;
  onClose: () => void;
  onOpenBotSelector: () => void;
  onRestartMatch: () => void;
  onResign: () => void;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const MenuDrawer: React.FC<MenuDrawerProps> = ({
  isOpen,
  bot,
  settings,
  moveHistory,
  language,
  onClose,
  onOpenBotSelector,
  onRestartMatch,
  onResign,
  onUpdateSettings
}) => {
  if (!isOpen) return null;
  const t = TRANSLATIONS[language];

  // Pair moves for table
  const pairedMoves: { num: number; white?: MoveRecord; black?: MoveRecord }[] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    pairedMoves.push({
      num: Math.floor(i / 2) + 1,
      white: moveHistory[i],
      black: moveHistory[i + 1]
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Panel */}
      <div className="relative w-80 max-w-[85vw] h-full bg-[#1b1511] text-[#ede8e1] border-r border-[#3a2c22] shadow-2xl flex flex-col z-10 animate-slideRight">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#30241b] bg-[#140f0c]">
          <div className="flex items-center gap-2">
            <span className="text-xl">♚</span>
            <span className="font-bold text-sm tracking-wide text-[#f5ebd9] uppercase">
              {t.menu}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#9e8f83] hover:text-white hover:bg-[#2b2019] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Opponent */}
        <div className="px-4 py-3 border-b border-[#30241b] bg-[#1e1713] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{bot.avatar}</span>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{bot.name}</span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[#3d2c1e] text-[#f59e0b] border border-[#523b28]">
                  {bot.elo} ELO
                </span>
              </div>
              <div className="text-[10px] text-[#9e8f83]">
                {bot.personalityTag} • {bot.category}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              onOpenBotSelector();
            }}
            className="text-[11px] font-semibold text-[#f59e0b] hover:underline"
          >
            {language === 'vi' ? 'Đổi Bot' : 'Change'}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenBotSelector();
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#2b2018] hover:bg-[#382b20] border border-[#443326] text-xs font-semibold text-[#ede8e1] transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span>{t.newGame}</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onRestartMatch();
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#2b2018] hover:bg-[#382b20] border border-[#443326] text-xs font-semibold text-[#ede8e1] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span>{t.restartMatch}</span>
            </button>
          </div>

          <button
            onClick={() => {
              onClose();
              onResign();
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#2b1818] hover:bg-[#381e1e] border border-[#542828] text-xs font-semibold text-[#f87171] transition-colors"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>{t.resign}</span>
          </button>

          {/* Piece Themes */}
          <div className="pt-2 border-t border-[#30241b]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9e8f83] mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span>{t.pieceTheme}</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { id: 'classic-wood', label: t.classicWood, icon: '🪵' },
                { id: 'liquid-glass', label: t.liquidGlass, icon: '💎' },
                { id: 'emerald-jade', label: t.emeraldJade, icon: '🟢' },
                { id: 'cyber-neon', label: t.cyberNeon, icon: '⚡' }
              ].map((th) => (
                <button
                  key={th.id}
                  onClick={() => onUpdateSettings({ pieceTheme: th.id as PieceTheme })}
                  className={`py-1.5 px-2 rounded-lg border text-left flex items-center gap-1.5 transition-all ${
                    settings.pieceTheme === th.id
                      ? 'bg-[#3d2c1e] text-[#f59e0b] border-[#d97706]'
                      : 'bg-[#18130f] text-[#c7b8a7] border-[#33251a] hover:bg-[#241b14]'
                  }`}
                >
                  <span className="text-sm">{th.icon}</span>
                  <span className="text-[11px] font-medium truncate">{th.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Board Themes */}
          <div className="pt-2 border-t border-[#30241b]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9e8f83] mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span>{t.boardTheme}</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {[
                { id: 'rustic-wood', label: t.rusticWood },
                { id: 'obsidian-marble', label: t.obsidianMarble },
                { id: 'tournament-blue', label: t.tournamentBlue }
              ].map((th) => (
                <button
                  key={th.id}
                  onClick={() => onUpdateSettings({ boardTheme: th.id as BoardTheme })}
                  className={`py-1.5 px-1.5 rounded-lg border text-center text-[10px] font-medium truncate transition-all ${
                    settings.boardTheme === th.id
                      ? 'bg-[#3d2c1e] text-[#f59e0b] border-[#d97706]'
                      : 'bg-[#18130f] text-[#c7b8a7] border-[#33251a] hover:bg-[#241b14]'
                  }`}
                >
                  {th.label}
                </button>
              ))}
            </div>
          </div>

          {/* Camera View Mode */}
          <div className="pt-2 border-t border-[#30241b]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9e8f83] mb-2 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span>{t.cameraTilt}</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                onClick={() => onUpdateSettings({ cameraTilt: 'photo' })}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                  settings.cameraTilt === 'photo'
                    ? 'bg-[#3d2c1e] text-[#f59e0b] border-[#d97706]'
                    : 'bg-[#18130f] text-[#c7b8a7] border-[#33251a] hover:bg-[#241b14]'
                }`}
              >
                {t.viewPhoto}
              </button>
              <button
                onClick={() => onUpdateSettings({ cameraTilt: 'topdown' })}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                  settings.cameraTilt === 'topdown'
                    ? 'bg-[#3d2c1e] text-[#f59e0b] border-[#d97706]'
                    : 'bg-[#18130f] text-[#c7b8a7] border-[#33251a] hover:bg-[#241b14]'
                }`}
              >
                {t.viewTopdown}
              </button>
            </div>
          </div>

          {/* Toggles: Sound, Coords, Eval */}
          <div className="pt-2 border-t border-[#30241b] space-y-2">
            <div className="flex items-center justify-between text-xs py-1">
              <span className="flex items-center gap-2 text-[#c7b8a7]">
                {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-[#f59e0b]" /> : <VolumeX className="w-4 h-4 text-[#6e5d51]" />}
                <span>{t.sound}</span>
              </span>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                className="accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <span className="flex items-center gap-2 text-[#c7b8a7]">
                <Eye className="w-4 h-4 text-[#f59e0b]" />
                <span>{t.coordinates}</span>
              </span>
              <input
                type="checkbox"
                checked={settings.showCoordinates}
                onChange={(e) => onUpdateSettings({ showCoordinates: e.target.checked })}
                className="accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <span className="flex items-center gap-2 text-[#c7b8a7]">
                <BarChart2 className="w-4 h-4 text-[#f59e0b]" />
                <span>{t.showEval}</span>
              </span>
              <input
                type="checkbox"
                checked={settings.showEvaluationBar}
                onChange={(e) => onUpdateSettings({ showEvaluationBar: e.target.checked })}
                className="accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Language Switch */}
            <div className="flex items-center justify-between text-xs py-1.5 border-t border-[#2a1e16] mt-2">
              <span className="flex items-center gap-2 text-[#c7b8a7]">
                <Globe className="w-4 h-4 text-[#f59e0b]" />
                <span>Ngôn ngữ / Language</span>
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => onUpdateSettings({ language: 'vi' })}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    settings.language === 'vi' ? 'bg-[#d97706] text-black' : 'text-[#8c7b6e] hover:text-white'
                  }`}
                >
                  VI
                </button>
                <button
                  onClick={() => onUpdateSettings({ language: 'en' })}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    settings.language === 'en' ? 'bg-[#d97706] text-black' : 'text-[#8c7b6e] hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>

          {/* Move History Table */}
          <div className="pt-2 border-t border-[#30241b]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9e8f83] mb-1.5">
              {t.history} ({moveHistory.length})
            </label>
            <div className="max-h-36 overflow-y-auto bg-[#140f0c] p-2 rounded-lg border border-[#2e2117] font-mono text-[11px]">
              {pairedMoves.length === 0 ? (
                <div className="text-[#665447] text-center py-2">--</div>
              ) : (
                pairedMoves.map(({ num, white, black }) => (
                  <div key={num} className="grid grid-cols-12 py-0.5 px-1 hover:bg-[#211812] rounded">
                    <span className="col-span-3 text-[#6e5d51]">{num}.</span>
                    <span className="col-span-4 text-[#ede8e1] font-semibold">{white?.san}</span>
                    <span className="col-span-5 text-[#a89a8e]">{black?.san || ''}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer with GitHub info */}
        <div className="px-4 py-2.5 border-t border-[#30241b] bg-[#140f0c] text-[10px] text-[#806f62] flex items-center justify-between">
          <span>github: minhhoang2007</span>
          <span>Stockfish Engine</span>
        </div>
      </div>
    </div>
  );
};
