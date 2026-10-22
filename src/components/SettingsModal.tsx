import React from 'react';
import { GameSettings, BoardTheme, PieceTheme } from '../types/chess';
import { TRANSLATIONS } from '../locales/i18n';
import { Settings, Volume2, VolumeX, Eye, Sparkles, X, Layers, Compass } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onClose
}) => {
  if (!isOpen) return null;
  const t = TRANSLATIONS[settings.language];

  const pieceThemes: { id: PieceTheme; label: string; desc: string; preview: string }[] = [
    {
      id: 'classic-wood',
      label: t.classicWood,
      desc: 'Polished ivory & ebony wood (photo style)',
      preview: '🪵'
    },
    {
      id: 'liquid-glass',
      label: t.liquidGlass,
      desc: 'Refractive liquid glass with chromatic dispersion',
      preview: '💎'
    },
    {
      id: 'emerald-jade',
      label: t.emeraldJade,
      desc: 'Translucent imperial jade & white quartz',
      preview: '🟢'
    },
    {
      id: 'cyber-neon',
      label: t.cyberNeon,
      desc: 'Glowing cyber luminescence neon glass',
      preview: '⚡'
    }
  ];

  const boardThemes: { id: BoardTheme; label: string; preview: string }[] = [
    { id: 'rustic-wood', label: t.rusticWood, preview: '🟫' },
    { id: 'obsidian-marble', label: t.obsidianMarble, preview: '⬛' },
    { id: 'tournament-blue', label: t.tournamentBlue, preview: '🟦' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#1b1511] text-[#ede8e1] rounded-2xl border border-[#443326] p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#30241b] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              {t.theme}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Piece Themes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#9e8f83] mb-2.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#f59e0b]" />
              <span>{t.pieceTheme}</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {pieceThemes.map((theme) => {
                const active = settings.pieceTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => onUpdateSettings({ pieceTheme: theme.id })}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      active
                        ? 'bg-[#3d2c1e] border-[#d97706] text-white shadow-md'
                        : 'bg-[#18130f] border-[#33251a] hover:bg-[#241b14] text-[#c7b8a7]'
                    }`}
                  >
                    <span className="text-2xl mt-0.5">{theme.preview}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{theme.label}</div>
                      <div className="text-[11px] text-[#9e8f83] mt-0.5 line-clamp-2">
                        {theme.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Board Themes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#9e8f83] mb-2.5 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#f59e0b]" />
              <span>{t.boardTheme}</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {boardThemes.map((b) => {
                const active = settings.boardTheme === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => onUpdateSettings({ boardTheme: b.id })}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      active
                        ? 'bg-[#3d2c1e] border-[#d97706] text-white shadow-md'
                        : 'bg-[#18130f] border-[#33251a] hover:bg-[#241b14] text-[#c7b8a7]'
                    }`}
                  >
                    <div className="text-xl mb-1">{b.preview}</div>
                    <div className="text-xs font-medium">{b.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Camera View */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#9e8f83] mb-2.5 flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#f59e0b]" />
              <span>{t.cameraTilt}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ cameraTilt: 'photo' })}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  settings.cameraTilt === 'photo'
                    ? 'bg-[#3d2c1e] text-[#f59e0b] border-[#d97706]'
                    : 'bg-[#18130f] text-[#c7b8a7] border-[#33251a] hover:bg-[#241b14]'
                }`}
              >
                {t.viewPhoto}
              </button>
              <button
                onClick={() => onUpdateSettings({ cameraTilt: 'topdown' })}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  settings.cameraTilt === 'topdown'
                    ? 'bg-[#3d2c1e] text-[#f59e0b] border-[#d97706]'
                    : 'bg-[#18130f] text-[#c7b8a7] border-[#33251a] hover:bg-[#241b14]'
                }`}
              >
                {t.viewTopdown}
              </button>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2 border-t border-[#30241b]">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#140f0c]">
              <div className="flex items-center gap-3">
                {settings.soundEnabled ? <Volume2 className="w-5 h-5 text-[#f59e0b]" /> : <VolumeX className="w-5 h-5 text-[#6e5d51]" />}
                <div>
                  <div className="text-sm font-medium text-neutral-200">{t.sound}</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#140f0c]">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-[#f59e0b]" />
                <div>
                  <div className="text-sm font-medium text-neutral-200">{t.coordinates}</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showCoordinates}
                onChange={(e) => onUpdateSettings({ showCoordinates: e.target.checked })}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-[#30241b] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-[#b45309] hover:bg-[#d97706] text-white font-bold text-sm transition-all"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
