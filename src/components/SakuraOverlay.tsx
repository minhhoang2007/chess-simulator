import React, { useMemo } from 'react';

interface Petal {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  swayDuration: number;
  opacity: number;
}

export const SakuraOverlay: React.FC = () => {
  const petals = useMemo<Petal[]>(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.random() * 100, // 0..100vw
      delay: Math.random() * 10,
      duration: 12 + Math.random() * 10, // 12..22s
      size: 10 + Math.random() * 8, // 10..18px
      swayDuration: 3 + Math.random() * 3,
      opacity: 0.55 + Math.random() * 0.35
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {petals.map((p) => (
        <div
          key={p.id}
          className="absolute top-[-40px]"
          style={{
            left: `${p.left}%`,
            animation: `sakuraFall ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`
          }}
        >
          <div
            style={{
              width: `${p.size}px`,
              height: `${p.size * 1.3}px`,
              opacity: p.opacity,
              animation: `sakuraSway ${p.swayDuration}s ease-in-out infinite alternate`
            }}
            className="rounded-[80%_0_80%_40%] bg-gradient-to-br from-[#ffd5e2] via-[#ffbccc] to-[#ff9ebb] shadow-[0_1px_4px_rgba(255,160,185,0.4)]"
          />
        </div>
      ))}
    </div>
  );
};
