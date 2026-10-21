import React from 'react';
import { EvaluationState, Language } from '../types/chess';
import { TRANSLATIONS } from '../locales/i18n';

interface EvaluationBarProps {
  evaluation: EvaluationState;
  language: Language;
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({ evaluation, language }) => {
  const t = TRANSLATIONS[language];

  // Convert eval to percentage for White (0% to 100%)
  // 50% is equal. +5 cp is ~90%, -5 cp is ~10%.
  let whitePercent = 50;
  let text = '0.0';

  if (evaluation.type === 'mate') {
    if (evaluation.value > 0) {
      whitePercent = 100;
      text = `M${evaluation.value}`;
    } else {
      whitePercent = 0;
      text = `-M${Math.abs(evaluation.value)}`;
    }
  } else {
    const cp = evaluation.value;
    // Logistic / sigmoid compression: 1 / (1 + 10^(-cp / 4))
    const winProb = 1 / (1 + Math.pow(10, -cp / 4));
    whitePercent = Math.min(96, Math.max(4, Math.round(winProb * 100)));

    if (Math.abs(cp) < 0.1) {
      text = '0.0';
    } else if (cp > 0) {
      text = `+${cp.toFixed(1)}`;
    } else {
      text = cp.toFixed(1);
    }
  }

  return (
    <div
      className="relative flex flex-col items-center w-8 md:w-9 h-64 md:h-80 bg-neutral-900/90 rounded-xl overflow-hidden border border-white/10 shadow-2xl backdrop-blur-md"
      title={language === 'vi' ? 'Thanh đánh giá thế trận Stockfish' : 'Stockfish live position evaluation'}
    >
      {/* Black's section (top) */}
      <div
        className="w-full bg-neutral-900 transition-all duration-500 ease-out flex items-start justify-center pt-1"
        style={{ height: `${100 - whitePercent}%` }}
      >
        {whitePercent < 50 && (
          <span className="text-[11px] font-mono-eval font-bold text-neutral-300 drop-shadow">
            {text}
          </span>
        )}
      </div>

      {/* White's section (bottom) */}
      <div
        className="w-full bg-gradient-to-t from-neutral-100 to-white transition-all duration-500 ease-out flex items-end justify-center pb-1"
        style={{ height: `${whitePercent}%` }}
      >
        {whitePercent >= 50 && (
          <span className="text-[11px] font-mono-eval font-bold text-neutral-900 drop-shadow">
            {text}
          </span>
        )}
      </div>

      {/* Center line marker */}
      <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-amber-400/60 pointer-events-none -translate-y-1/2" />
    </div>
  );
};
