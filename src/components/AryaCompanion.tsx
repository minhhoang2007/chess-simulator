import React, { useEffect, useRef, useState } from 'react';

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
  ambient?: Ambient;
  isStatic?: boolean;
  staticFrame?: number;
}

// Ambient behaviour: hold a still base pose, blink at random intervals and
// occasionally glance, so she never cycles through frames nonstop.
interface Ambient {
  base: number;
  blink: Step[]; // frames shown for one blink
  glance?: Step[]; // optional short look-away, returns to base afterwards
  glanceChance?: number; // 0..1, chance a pause ends in a glance instead of a blink
}

const THINKING_AMBIENT: Ambient = {
  base: 0,
  blink: [[14, 140]],
  glance: [[8, 1300]],
  glanceChance: 0.25
};

const WAITING_AMBIENT: Ambient = {
  base: 0,
  blink: [[8, 60], [9, 90], [10, 60]]
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const FRAME_CONFIG: Record<AryaState, StateConfig> = {
  start: { folder: 'waving_smooth', count: 12, intervalMs: 90 },
  // Your turn: focused hands-on-hips pose
  thinking: { folder: 'review_smooth', count: 16, intervalMs: 130, ambient: THINKING_AMBIENT },
  // Bot's turn: relaxed, hands down
  bot_moving: { folder: 'idle_smooth', count: 16, intervalMs: 150, ambient: WAITING_AMBIENT },
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

    if (config.ambient) {
      const { base, blink, glance, glanceChance = 0 } = config.ambient;
      let timer: number;
      const play = (steps: Step[], done: () => void) => {
        let i = 0;
        const next = () => {
          if (i >= steps.length) return done();
          const [frame, ms] = steps[i++];
          setFrameIndex(frame);
          timer = window.setTimeout(next, ms);
        };
        next();
      };
      const rest = () => {
        setFrameIndex(base);
        timer = window.setTimeout(() => {
          if (glance && Math.random() < glanceChance) {
            play(glance, rest);
          } else {
            const doubleBlink = Math.random() < 0.15;
            const steps = doubleBlink ? [...blink, [base, 160] as Step, ...blink] : blink;
            play(steps, rest);
          }
        }, rand(2200, 5200));
      };
      rest();
      return () => window.clearTimeout(timer);
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

  // Remember the last frame of the previous pose so it can fade out
  const lastSrcRef = useRef(frameSrc);
  const lastFolderRef = useRef(currentFolder);
  const [fadeFromSrc, setFadeFromSrc] = useState<string | null>(null);
  useEffect(() => {
    if (lastFolderRef.current !== currentFolder) {
      setFadeFromSrc(lastSrcRef.current);
      lastFolderRef.current = currentFolder;
      const t = window.setTimeout(() => setFadeFromSrc(null), 260);
      lastSrcRef.current = frameSrc;
      return () => window.clearTimeout(t);
    }
    lastSrcRef.current = frameSrc;
  }, [currentFolder, frameSrc]);

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
          {fadeFromSrc && (
            <img
              key={`from-${fadeFromSrc}`}
              src={fadeFromSrc}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)] alya-fade-out"
              draggable={false}
            />
          )}
          <img
            key={`pose-${currentFolder}`}
            src={frameSrc}
            alt="Alya Companion"
            className={`relative w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)] ${fadeFromSrc ? 'alya-fade-in' : ''}`}
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
