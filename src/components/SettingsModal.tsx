import React from 'react';
import { GameSettings, BoardTheme, PieceTheme, Language } from '../types/chess';
import { TRANSLATIONS } from '../locales/i18n';
import { Settings, Volume2, VolumeX, Eye, Sparkles, X, Layers, Compass, GitBranch } from 'lucide-react';

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
      id: 'liquid-glass',
      label: t.liquidGlass,
      desc: settings.language === 'vi' ? 'Thủy tinh lỏng khúc xạ đa hướng, ánh xanh pha lê' : 'Refractive liquid glass with chromatic dispersion',
      preview: '💎'
    },
    {
      id: 'classic-wood',
      label: t.classicWood,
      desc: settings.language === 'vi' ? 'Gỗ hoàng dương & mun cổ điển (chuẩn ảnh mẫu)' : 'Polished ivory & ebony wood (photo style)',
      preview: '🪵'
    },
    {
      id: 'emerald-jade',
      label: t.emeraldJade,
      desc: settings.language === 'vi' ? 'Ngọc bích hoàng tộc óng ả, cẩm thạch trắng' : 'Translucent imperial jade & white quartz',
      preview: '🟢'
    },
    {
      id: 'cyber-neon',
      label: t.cyberNeon,
      desc: settings.language === 'vi' ? 'Thủy tinh phát quang dạ quang Neon Sci-Fi' : 'Glowing cyber luminescence neon glass',
      preview: '⚡'
    }
  ];

  const boardThemes: { id: BoardTheme; label: string; preview: string }[] = [
    { id: 'rustic-wood', label: t.rusticWood, preview: '🟫' },
    { id: 'obsidian-marble', label: t.obsidianMarble, preview: '⬛' },
    { id: 'tournament-blue', label: t.tournamentBlue, preview: '🟦' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl glass-panel rounded-2xl border border-white/15 p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-serif-luxury text-white">
              {t.settings}
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
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
                        ? 'bg-amber-400/15 border-amber-400 text-white shadow-md'
                        : 'bg-white/[0.03] border-white/10 hover:bg-white/5 text-neutral-300'
                    }`}
                  >
                    <span className="text-2xl mt-0.5">{theme.preview}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{theme.label}</div>
                      <div className="text-[11px] text-neutral-400 mt-0.5 line-clamp-2">
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2.5 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
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
                        ? 'bg-amber-400/15 border-amber-400 text-white shadow-md'
                        : 'bg-white/[0.03] border-white/10 hover:bg-white/5 text-neutral-300'
                    }`}
                  >
                    <div className="text-xl mb-1">{b.preview}</div>
                    <div className="text-xs font-medium">{b.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Camera Presets */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2.5 flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>{t.cameraPresets}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'perspective', label: t.viewPerspective },
                { id: 'topdown', label: t.viewTopdown },
                { id: 'white', label: t.viewWhite },
                { id: 'black', label: t.viewBlack }
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => onUpdateSettings({ cameraView: view.id as any })}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                    settings.cameraView === view.id
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                      : 'bg-white/[0.03] border-white/10 text-neutral-300 hover:bg-white/5'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02]">
              <div className="flex items-center gap-3">
                {settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-amber-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-neutral-500" />
                )}
                <div>
                  <div className="text-sm font-medium text-neutral-200">{t.sound}</div>
                  <div className="text-[11px] text-neutral-400">Web Audio API Synth</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Coordinates Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-sm font-medium text-neutral-200">{t.coordinates}</div>
                  <div className="text-[11px] text-neutral-400">A-H / 1-8</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showCoordinates}
                onChange={(e) => onUpdateSettings({ showCoordinates: e.target.checked })}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Language Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02]">
              <div className="text-sm font-medium text-neutral-200">
                {settings.language === 'vi' ? 'Ngôn Ngữ Giao Diện' : 'Language'}
              </div>
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ language: 'vi' })}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                    settings.language === 'vi' ? 'bg-amber-400 text-neutral-950 shadow' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  🇻🇳 VI
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ language: 'en' })}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                    settings.language === 'en' ? 'bg-amber-400 text-neutral-950 shadow' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  🇬🇧 EN
                </button>
              </div>
            </div>
          </div>

          {/* GitHub banner */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-neutral-900 to-neutral-800 border border-white/10 flex items-center gap-3">
            <GitBranch className="w-5 h-5 text-neutral-300" />
            <div className="text-xs text-neutral-300">
              <span className="font-semibold text-white">GitHub: </span>
              <code className="text-amber-300">minhhoang2007/liquid-glass-chess-3d</code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm transition-all"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
