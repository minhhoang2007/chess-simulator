import React, { useEffect, useState } from 'react';

export type AryaState = 'thinking' | 'bot_moving' | 'victory' | 'defeat' | 'draw';

interface AryaCompanionProps {
  state: AryaState;
  botName: string;
  botElo: number;
  onClickChangeBot?: () => void;
}

const FRAME_CONFIG: Record<string, { folder: string; count: number; intervalMs: number }> = {
  thinking: { folder: 'review', count: 6, intervalMs: 180 },
  bot_moving: { folder: 'waiting', count: 6, intervalMs: 140 },
  victory: { folder: 'jumping', count: 5, intervalMs: 115 },
  defeat: { folder: 'failed', count: 8, intervalMs: 160 },
  draw: { folder: 'waving', count: 4, intervalMs: 160 }
};

export const AryaCompanion: React.FC<AryaCompanionProps> = ({
  state,
  botName,
  botElo,
  onClickChangeBot
}) => {
  const [frameIndex, setFrameIndex] = useState(0);
  const config = FRAME_CONFIG[state] || FRAME_CONFIG.thinking;

  // Preload all frames once so animation never flickers
  useEffect(() => {
    Object.values(FRAME_CONFIG).forEach(({ folder, count }) => {
      for (let i = 0; i < count; i++) {
        const img = new Image();
        img.src = `/arya/${folder}/${String(i).padStart(2, '0')}.png`;
      }
    });
  }, []);

  useEffect(() => {
    setFrameIndex(0);
    const id = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % config.count);
    }, config.intervalMs);
    return () => window.clearInterval(id);
  }, [config.folder, config.count, config.intervalMs]);

  const frameStr = String(frameIndex % config.count).padStart(2, '0');
  const frameSrc = `/arya/${config.folder}/${frameStr}.png`;

  return (
    <div className="fixed bottom-5 left-5 z-30 flex items-end gap-2.5 select-none pointer-events-auto">
      {/* Character + Floating Emotion Bubble */}
      <div className="relative flex flex-col items-center">
        {/* Speech / Emotion Bubble above Arya */}
        <div
          className={`mb-1.5 px-3 py-1.5 rounded-2xl shadow-lg border text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 ${
            state === 'victory'
              ? 'bg-[#81b64c] text-white border-[#9ad061] animate-bounce shadow-[0_6px_20px_rgba(129,182,76,0.45)]'
              : state === 'defeat'
              ? 'bg-[#262421]/95 text-[#e2ded9] border-white/15'
              : 'bg-[#262421]/95 text-[#f0ece6] border-white/15 backdrop-blur-md'
          }`}
        >
          {state === 'victory' && (
            <>
              <span className="text-sm">🎉</span>
              <span>Checkmate! Congratulations!</span>
            </>
          )}
          {state === 'defeat' && (
            <>
              <span className="text-sm">🥺</span>
              <span>Nice try! Rematch?</span>
            </>
          )}
          {state === 'draw' && (
            <>
              <span className="text-sm">🤝</span>
              <span>Good game! Draw!</span>
            </>
          )}
          {state === 'thinking' && (
            <>
              <span className="text-sm">🤔</span>
              <span className="text-[#c8c2b8]">Thinking</span>
              <span className="inline-flex gap-0.5 ml-0.5 items-center">
                <span className="w-1 h-1 rounded-full bg-[#81b64c] animate-ping" />
                <span className="w-1 h-1 rounded-full bg-[#81b64c]" />
              </span>
            </>
          )}
          {state === 'bot_moving' && (
            <>
              <span className="text-sm">💭</span>
              <span className="text-[#c8c2b8]">My turn!</span>
            </>
          )}

          {/* Little speech bubble tail */}
          <div
            className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 border-r border-b ${
              state === 'victory'
                ? 'bg-[#81b64c] border-[#9ad061]'
                : 'bg-[#262421] border-white/15'
            }`}
          />
        </div>

        {/* Animated Chibi Arya Sprite (enlarged by ~10%+) */}
        <div
          onClick={onClickChangeBot}
          title="Click to change bot / difficulty"
          className={`relative w-[110px] h-[130px] sm:w-[126px] sm:h-[148px] cursor-pointer transition-transform duration-300 hover:scale-105 ${
            state === 'victory' ? 'animate-arya-celebrate' : ''
          }`}
        >
          <img
            src={frameSrc}
            alt="Arya Companion"
            className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)]"
            draggable={false}
          />
        </div>

        {/* Clean Chess.com-style Bot Name & Rating Pill under Arya */}
        <button
          onClick={onClickChangeBot}
          className="mt-0.5 px-3 py-1 rounded-lg bg-[#262421]/90 hover:bg-[#312e2b] border border-white/12 shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-[#81b64c]" />
          <span className="text-xs font-bold text-white tracking-tight">{botName}</span>
          <span className="text-[11px] font-medium text-[#9e9b95]">({botElo})</span>
        </button>
      </div>
    </div>
  );
};
