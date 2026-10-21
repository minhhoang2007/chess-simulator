import React from 'react';
import { BotProfile, GameSettings, Language, MoveRecord, PieceTheme, BoardTheme } from '../types/chess';
import {
  X,
  PlusCircle,
  RotateCcw,
  Flag,
  Volume2,
  VolumeX,
  Eye
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
  onClose,
  onOpenBotSelector,
  onRestartMatch,
  onResign,
  onUpdateSettings
}) => {
  if (!isOpen) return null;

  const pairedMoves: { num: number; white?: MoveRecord; black?: MoveRecord }[] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    pairedMoves.push({
      num: Math.floor(i / 2) + 1,
      white: moveHistory[i],
      black: moveHistory[i + 1]
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/55 backdrop-blur-xs transition-opacity"
      />

      {/* Chess.com Dark Slate Drawer */}
      <div className="relative w-76 max-w-[85vw] h-full bg-[#262421] text-[#f1f1f1] border-r border-white/10 shadow-2xl flex flex-col z-10 animate-slideRight">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/8 bg-[#1f1e1b]">
          <span className="font-bold text-sm tracking-tight text-white">
            Game Menu
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9e9b95] hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Opponent Card */}
        <div className="px-4 py-3 border-b border-white/8 bg-[#21201d] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={bot.avatar} alt={bot.name} className="w-9 h-9 object-contain" />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{bot.name}</span>
                <span className="text-[11px] font-bold text-[#81b64c]">({bot.elo})</span>
              </div>
              <div className="text-[11px] text-[#9e9b95]">
                {bot.personalityTag}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              onOpenBotSelector();
            }}
            className="px-2.5 py-1 rounded-md bg-[#312e2b] hover:bg-[#3d3935] text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Change Bot
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenBotSelector();
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#81b64c] hover:bg-[#91c859] text-xs font-bold text-white transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Game</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onRestartMatch();
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#312e2b] hover:bg-[#3b3834] text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rematch</span>
            </button>
          </div>

          <button
            onClick={() => {
              onClose();
              onResign();
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#312e2b] hover:bg-[#3f2626] text-xs font-semibold text-[#ef5350] transition-colors cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Resign</span>
          </button>

          {/* Piece Style */}
          <div className="pt-3 border-t border-white/8">
            <label className="block text-xs font-semibold text-[#9e9b95] mb-2">
              Pieces
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'classic-wood', label: 'Classic Wood' },
                { id: 'liquid-glass', label: 'Liquid Glass' },
                { id: 'emerald-jade', label: 'Emerald Jade' },
                { id: 'cyber-neon', label: 'Neon Glass' }
              ].map((th) => (
                <button
                  key={th.id}
                  onClick={() => onUpdateSettings({ pieceTheme: th.id as PieceTheme })}
                  className={`py-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    settings.pieceTheme === th.id
                      ? 'bg-[#363330] text-white border-[#81b64c]'
                      : 'bg-[#1f1e1b] text-[#9e9b95] border-white/8 hover:text-white'
                  }`}
                >
                  {th.label}
                </button>
              ))}
            </div>
          </div>

          {/* Board Theme */}
          <div className="pt-3 border-t border-white/8">
            <label className="block text-xs font-semibold text-[#9e9b95] mb-2">
              Board
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'rustic-wood', label: 'Wood' },
                { id: 'obsidian-marble', label: 'Slate' },
                { id: 'tournament-blue', label: 'Blue' }
              ].map((th) => (
                <button
                  key={th.id}
                  onClick={() => onUpdateSettings({ boardTheme: th.id as BoardTheme })}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    settings.boardTheme === th.id
                      ? 'bg-[#363330] text-white border-[#81b64c]'
                      : 'bg-[#1f1e1b] text-[#9e9b95] border-white/8 hover:text-white'
                  }`}
                >
                  {th.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sound & Coordinates */}
          <div className="pt-3 border-t border-white/8 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-[#c8c5c0]">
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-[#81b64c]" />
                ) : (
                  <VolumeX className="w-4 h-4 text-[#7a7772]" />
                )}
                <span>Move Sounds</span>
              </span>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                className="accent-[#81b64c] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-[#c8c5c0]">
                <Eye className="w-4 h-4 text-[#81b64c]" />
                <span>Board Coordinates</span>
              </span>
              <input
                type="checkbox"
                checked={settings.showCoordinates}
                onChange={(e) => onUpdateSettings({ showCoordinates: e.target.checked })}
                className="accent-[#81b64c] cursor-pointer"
              />
            </div>
          </div>

          {/* Move History (Chess.com notation list) */}
          <div className="pt-3 border-t border-white/8">
            <label className="block text-xs font-semibold text-[#9e9b95] mb-1.5">
              Moves ({moveHistory.length})
            </label>
            <div className="max-h-40 overflow-y-auto bg-[#1f1e1b] p-2 rounded-lg border border-white/8 text-xs font-medium">
              {pairedMoves.length === 0 ? (
                <div className="text-[#6e6b65] text-center py-2">No moves yet</div>
              ) : (
                pairedMoves.map(({ num, white, black }) => (
                  <div
                    key={num}
                    className="grid grid-cols-12 py-1 px-2 odd:bg-white/[0.02] rounded"
                  >
                    <span className="col-span-3 text-[#7a7772]">{num}.</span>
                    <span className="col-span-4 text-white font-semibold">{white?.san}</span>
                    <span className="col-span-5 text-[#c8c5c0]">{black?.san || ''}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
