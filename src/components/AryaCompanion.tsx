import React, { useEffect, useState } from 'react';

export type AryaState = 'start' | 'thinking' | 'bot_moving' | 'victory' | 'defeat' | 'draw';

interface AryaCompanionProps {
  state: AryaState;
  botName: string;
  botElo: number | string;
  onClickChangeBot?: () => void;
}

type Step = [frame: number, ms: number];

interface StateConfig {
  folder: string;
  count: number;
  intervalMs: number;
  // Optional timeline of [frame, duration] steps that loops. Lets a pose hold
  // still for a while instead of cycling every frame nonstop.
  sequence?: Step[];
  isStatic?: boolean;
  staticFrame?: number;
}

// Frames a..b (inclusive, either direction), each shown for `ms`.
const ramp = (a: number, b: number, ms: number): Step[] => {
  const steps: Step[] = [];
  const dir = a <= b ? 1 : -1;
  for (let i = a; dir > 0 ? i <= b : i >= b; i += dir) steps.push([i, ms]);
  return steps;
};

// Thinking: mostly still, with a slow head tilt each way and a blink in between.
const THINKING_SEQUENCE: Step[] = [
  [0, 2200],
  ...ramp(1, 4, 130),
  [4, 1100],
  ...ramp(3, 1, 130),
  [0, 1800],
  [14, 150],
  [0, 2000],
  ...ramp(9, 11, 130),
  [12, 1000],
  ...ramp(11, 9, 130),
  [0, 1600]
];

// Waiting for the bot: calm, hands together, with an occasional small gesture.
const WAITING_SEQUENCE: Step[] = [
  [0, 1800],
  ...ramp(1, 4, 150),
  [4, 700],
  ...ramp(3, 1, 150),
  [0, 2400],
  ...ramp(5, 7, 150),
  [8, 500],
  [9, 400],
  [10, 150],
  ...ramp(11, 15, 150),
  [0, 2000]
];

const FRAME_CONFIG: Record<AryaState, StateConfig> = {
  start: { folder: 'waving_smooth', count: 12, intervalMs: 90 },
  thinking: { folder: 'review_smooth', count: 16, intervalMs: 130, sequence: THINKING_SEQUENCE },
  bot_moving: { folder: 'waiting_smooth', count: 16, intervalMs: 150, sequence: WAITING_SEQUENCE },
  // Victory: static smiling pose
  victory: { folder: 'waving', count: 4, intervalMs: 160, isStatic: true, staticFrame: 1 },
  // Defeat: static head-down pose (frame 03)
  defeat: { folder: 'failed', count: 8, intervalMs: 160, isStatic: true, staticFrame: 3 },
  draw: { folder: 'waving_smooth', count: 12, intervalMs: 100 }
};

export const AryaCompanion: React.FC<AryaCompanionProps> = ({
  state,
  botName,
  onClickChangeBot
}) => {
  const [frameIndex, setFrameIndex] = useState(0);
  const [hasWavedOnce, setHasWavedOnce] = useState(false);
  const config = FRAME_CONFIG[state] || FRAME_CONFIG.start;

  // Preload all sprite folders once so animations never flicker
  useEffect(() => {
    const ALL_FOLDERS = [
      { folder: 'waving_smooth', count: 12 },
      { folder: 'review_smooth', count: 16 },
      { folder: 'waiting_smooth', count: 16 },
      { folder: 'idle_smooth', count: 16 },
      { folder: 'waving', count: 4 },
      { folder: 'failed', count: 8 },
      { folder: 'idle', count: 6 }
    ];
    ALL_FOLDERS.forEach(({ folder, count }) => {
      for (let i = 0; i < count; i++) {
        const img = new Image();
        img.src = `${import.meta.env.BASE_URL}arya/${folder}/${String(i).padStart(2, '0')}.png`;
      }
    });
  }, []);

  // Reset wave status whenever state leaves 'start' or when bot changes
  useEffect(() => {
    if (state !== 'start') {
      setHasWavedOnce(false);
    }
  }, [state, botName]);

  useEffect(() => {
    // For 'start' state: wave smoothly once across all 12 frames, then settle into static idle pose
    if (state === 'start' && !hasWavedOnce) {
      setFrameIndex(0);
      let step = 0;
      const id = window.setInterval(() => {
        step++;
        if (step >= 12) {
          window.clearInterval(id);
          setHasWavedOnce(true);
          setFrameIndex(0);
        } else {
          setFrameIndex(step);
        }
      }, 85);
      return () => window.clearInterval(id);
    }

    if (state === 'start' && hasWavedOnce) {
      setFrameIndex(0);
      return;
    }

    if (config.isStatic) {
      setFrameIndex(config.staticFrame ?? 0);
      return;
    }

    if (config.sequence) {
      const seq = config.sequence;
      let i = 0;
      let timer: number;
      const show = () => {
        const [frame, ms] = seq[i];
        setFrameIndex(frame);
        i = (i + 1) % seq.length;
        timer = window.setTimeout(show, ms);
      };
      show();
      return () => window.clearTimeout(timer);
    }

    setFrameIndex(0);
    const id = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % config.count);
    }, config.intervalMs);
    return () => window.clearInterval(id);
  }, [state, hasWavedOnce, config]);

  const currentFolder =
    state === 'start'
      ? hasWavedOnce
        ? 'idle'
        : 'waving_smooth'
      : config.folder;

  const currentCount =
    state === 'start'
      ? hasWavedOnce
        ? 6
        : 12
      : config.count;

  const activeIndex =
    state === 'start'
      ? hasWavedOnce
        ? 0
        : frameIndex
      : config.isStatic
      ? (config.staticFrame ?? 0)
      : frameIndex;

  const frameStr = String(activeIndex % currentCount).padStart(2, '0');
  const frameSrc = `${import.meta.env.BASE_URL}arya/${currentFolder}/${frameStr}.png`;

  return (
    <div className="fixed bottom-5 left-5 z-30 flex items-end gap-2.5 select-none pointer-events-auto">
      {/* Character + Floating Emotion Bubble */}
      <div className="relative flex flex-col items-center">
        {/* Speech bubble */}
        <div
          className={`mb-1.5 px-3 py-1.5 rounded-2xl shadow-lg border text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 ${
            state === 'victory'
              ? 'bg-[#81b64c] text-white border-[#9ad061] shadow-[0_6px_20px_rgba(129,182,76,0.35)]'
              : state === 'defeat'
              ? 'bg-[#262421]/95 text-[#e2ded9] border-white/15'
              : 'bg-[#262421]/95 text-[#f0ece6] border-white/15 backdrop-blur-md'
          }`}
        >
          {state === 'start' && (
            <>
              <span className="text-sm">🌸</span>
              <span className="whitespace-nowrap">Ready to play!</span>
            </>
          )}
          {state === 'victory' && (
            <>
              <span className="text-sm">🎉</span>
              <span className="whitespace-nowrap">Checkmate! We won!</span>
            </>
          )}
          {state === 'defeat' && (
            <>
              <span className="text-sm">🥺</span>
              <span className="whitespace-nowrap">Nice try! Rematch?</span>
            </>
          )}
          {state === 'draw' && (
            <>
              <span className="text-sm">🤝</span>
              <span className="whitespace-nowrap">Good game! Draw!</span>
            </>
          )}
          {state === 'thinking' && (
            <>
              <span className="text-sm">🤔</span>
              <span className="text-[#e2ded9] whitespace-nowrap">Your turn!</span>
              <span className="inline-flex gap-0.5 ml-0.5 items-center">
                <span className="w-1 h-1 rounded-full bg-[#81b64c] animate-ping" />
                <span className="w-1 h-1 rounded-full bg-[#81b64c]" />
              </span>
            </>
          )}
          {state === 'bot_moving' && (
            <>
              <span className="text-sm">👀</span>
              <span className="text-[#c8c2b8] whitespace-nowrap">{botName.split(' ')[0]}&apos;s move</span>
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

        {/* Companion sprite */}
        <div
          onClick={onClickChangeBot}
          title="Alya (Your Companion)"
          className="relative w-[110px] h-[130px] sm:w-[126px] sm:h-[148px] cursor-pointer transition-transform duration-300 hover:scale-105"
        >
          <img
            src={frameSrc}
            alt="Alya Companion"
            className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)] transition-opacity duration-75"
            draggable={false}
          />
        </div>

        {/* Companion badge */}
        <div className="mt-0.5 px-3 py-1 rounded-lg bg-[#262421]/90 border border-white/12 shadow-md flex items-center gap-1.5">
          <span className="text-xs">🌸</span>
          <span className="text-xs font-bold text-white tracking-tight">Alya</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 border border-pink-400/25">
            Companion
          </span>
        </div>
      </div>
    </div>
  );
};
