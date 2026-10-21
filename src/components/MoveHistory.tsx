import React, { useEffect, useRef } from 'react';
import { MoveRecord, Language } from '../types/chess';
import { TRANSLATIONS } from '../locales/i18n';

interface MoveHistoryProps {
  history: MoveRecord[];
  language: Language;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ history, language }) => {
  const t = TRANSLATIONS[language];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  // Pair moves by turn (White move, Black move)
  const pairedMoves: { moveNumber: number; white?: MoveRecord; black?: MoveRecord }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    pairedMoves.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1]
    });
  }

  return (
    <div className="flex flex-col h-full bg-neutral-900/60 rounded-xl border border-white/10 overflow-hidden backdrop-blur-md">
      <div className="px-3 py-2 border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
        <span>{t.history}</span>
        <span className="text-[10px] text-neutral-500 font-mono">{history.length} moves</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
        {pairedMoves.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-500 text-xs italic py-6">
            1. e4 ...
          </div>
        ) : (
          pairedMoves.map(({ moveNumber, white, black }) => {
            const isLastWhite = white === history[history.length - 1];
            const isLastBlack = black === history[history.length - 1];

            return (
              <div
                key={moveNumber}
                className="grid grid-cols-12 py-1 px-2 rounded hover:bg-white/5 transition-colors items-center"
              >
                <span className="col-span-2 text-neutral-500 font-medium">
                  {moveNumber}.
                </span>
                <span
                  className={`col-span-5 px-1.5 py-0.5 rounded font-medium ${
                    isLastWhite
                      ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30'
                      : 'text-neutral-200'
                  }`}
                >
                  {white?.san}
                </span>
                <span
                  className={`col-span-5 px-1.5 py-0.5 rounded font-medium ${
                    isLastBlack
                      ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30'
                      : 'text-neutral-400'
                  }`}
                >
                  {black?.san || ''}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
