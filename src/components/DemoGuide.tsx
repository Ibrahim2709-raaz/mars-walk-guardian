import React from 'react';
import { ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react';

interface DemoGuideProps {
  step: number;
  routeReady: boolean;
  isBusy: boolean;
  onExplain: () => void;
  onInjectHazard: () => Promise<boolean>;
  onReplay: () => void;
  onReset: () => Promise<boolean>;
}

const STEPS = [
  'Show terrain-safe route',
  'Explain the decision',
  'Inject a blocked corridor',
  'Replay the return in 3D'
];

export const DemoGuide: React.FC<DemoGuideProps> = ({
  step,
  routeReady,
  isBusy,
  onExplain,
  onInjectHazard,
  onReplay,
  onReset
}) => {
  const next = async () => {
    if (step === 0) onExplain();
    else if (step === 1) await onInjectHazard();
    else if (step === 2) onReplay();
    else await onReset();
  };

  const buttonLabel = step === 0
    ? 'Explain route'
    : step === 1
      ? 'Inject hazard'
      : step === 2
        ? 'Replay in 3D'
        : 'Reset demo';

  return (
    <section className="demo-guide" aria-label="Guided judge demonstration">
      <div className="demo-guide__heading">
        <span><Sparkles className="h-3.5 w-3.5" /> Guided demo</span>
        <strong>{Math.min(step + 1, 4)}/4</strong>
      </div>
      <ol>
        {STEPS.map((label, index) => (
          <li key={label} className={index < step ? 'is-complete' : index === step ? 'is-current' : ''}>
            <span>{index < step ? <Check className="h-3 w-3" /> : index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <button type="button" disabled={!routeReady || isBusy} onClick={() => void next()}>
        {step === 3 ? <RotateCcw className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
        {isBusy ? 'Calculating…' : buttonLabel}
      </button>
    </section>
  );
};
