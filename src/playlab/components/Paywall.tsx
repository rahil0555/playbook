import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { usePlayLab } from '../app/PlayLabContext';
import { ACTIVITIES, getActivity } from '../data/activities';
import { springs } from '../motion/variants';
import type { ActivityId } from '../types/learning';
import type { CreditDecision } from '../lib/credits';
import { unitsLabel } from '../lib/credits';
import { DEMO_PLANS, DEFAULT_PLAN_ID } from '../lib/pricing';
import { Button } from './Button';
import { Companion } from './Companion';
import { Icon } from './Icon';
import { Illustration } from '../illustrations/Illustration';

interface PaywallProps {
  activityId: ActivityId;
  decision: CreditDecision;
  onUnlock: () => void;
  onResume: () => void;
  onClose: () => void;
}

function makeQuestion(): { text: string; answer: number } {
  const a = 3 + Math.floor(Math.random() * 6);
  const b = 2 + Math.floor(Math.random() * 5);
  return { text: `${a} + ${b}`, answer: a + b };
}

/** Local demo paywall. Selecting a demo plan never charges a payment method. */
export function Paywall({ activityId, decision, onUnlock, onResume, onClose }: PaywallProps) {
  const { reducedMotion, audio } = usePlayLab();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [question] = useState(makeQuestion);
  const [typed, setTyped] = useState('');
  const [wrong, setWrong] = useState(false);
  const [selected, setSelected] = useState(DEFAULT_PLAN_ID);
  const activity = getActivity(activityId);
  const freeNames = useMemo(() => ACTIVITIES.filter((a) => a.id !== 'alphabet').map((a) => a.title), []);

  useEffect(() => { dialogRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = () => {
    if (Number.parseInt(typed.trim(), 10) === question.answer) {
      audio.sfx('celebrate');
      onUnlock();
      onResume();
      return;
    }
    setWrong(true);
    setTyped('');
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-ink p-3 sm:p-6" role="presentation">
      <motion.div
        ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true"
        aria-labelledby="pl-paywall-title" aria-describedby="pl-paywall-child" data-paywall=""
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }} transition={springs.bouncy}
        className="pl-board my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl overflow-y-auto rounded-[2.2rem] p-4 text-center outline-none sm:max-h-[calc(100dvh-3rem)] sm:p-6"
      >
        <div className="grid gap-5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:items-start">
          <div>
            <div className="flex items-start justify-between gap-3">
              <span className="pl-gem grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sun-500 text-ink"><Icon name="star" size={28} filled /></span>
              <button type="button" onClick={onClose} aria-label="Close and go back to playing" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-ink/30 bg-white text-ink shadow-sm hover:bg-cream-50"><Icon name="close" size={20} /></button>
            </div>
            <h2 id="pl-paywall-title" className="mt-2 font-display text-3xl font-bold leading-tight text-ink">Free play pause</h2>
            <p id="pl-paywall-child" className="mt-2 text-lg text-ink-soft">
              You’ve used {unitsLabel(decision.used, decision.noun)} in <strong>{activity.title}</strong>. Your progress is saved; a grown-up can unlock the rest and continue right here.
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-3" aria-hidden="true">
              {(['phonics', 'word-builder', 'sentences', 'matching'] as ActivityId[]).map((id) => {
                const a = getActivity(id);
                return <li key={id} className="pl-paper flex flex-col items-center gap-1 rounded-[1.4rem] p-2"><Illustration name={a.illustration} className="h-12 w-12 opacity-60" /><span className="text-xs font-semibold text-ink-soft">{a.title}</span></li>;
              })}
            </ul>
            <div className="mt-4 flex items-center justify-center gap-2"><Companion mood="think" className="h-12 w-12" /><p className="max-w-[18rem] text-sm text-ink-soft">Pip will keep your stars and stickers safe.</p></div>
          </div>
          <div>
            <div className="rounded-[1.6rem] bg-white/80 p-4 text-left shadow-soft">
          <p className="font-display text-lg font-semibold text-ink">Choose a demo plan</p>
          <p className="mt-1 text-sm text-ink-soft">Prices below are examples for planning only. This demo does not take payment.</p>
          <div className="mt-3 grid gap-2">
            {DEMO_PLANS.map((plan) => (
              <button key={plan.id} type="button" aria-pressed={selected === plan.id} onClick={() => setSelected(plan.id)} className={`rounded-2xl border-2 p-3 text-left ${selected === plan.id ? 'border-brand-600 bg-brand-50' : 'border-brand-100 bg-white'}`}>
                <span className="flex items-center justify-between gap-2 font-display font-semibold text-ink"><span>{plan.name}{plan.badge ? ` · ${plan.badge}` : ''}</span><span>{plan.price} <span className="text-sm font-normal">{plan.period}</span></span></span>
                <span className="mt-1 block text-sm text-ink-soft">{plan.blurb}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 font-display text-base font-semibold text-ink">Grown-ups: unlock the demo</p>
          <p className="mt-1 text-sm text-ink-soft">Unlock all five activities for this learner. To continue, answer this quick question to show you’re a grown-up.</p>
          <label htmlFor="pl-paywall-answer" className="mt-3 block font-display text-base font-semibold text-ink">What is {question.text}?</label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input id="pl-paywall-answer" ref={inputRef} value={typed} onChange={(e) => { setTyped(e.target.value); setWrong(false); }} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} inputMode="numeric" autoComplete="off" aria-invalid={wrong} aria-describedby={wrong ? 'pl-paywall-error' : undefined} className="min-h-[3rem] w-24 rounded-2xl border-[3px] border-brand-200 bg-white px-3 text-center font-display text-lg text-ink outline-none focus:border-brand-500" />
            <Button variant="primary" accent="brand" onClick={submit} disabled={typed.trim() === ''}>Unlock everything</Button>
          </div>
          {wrong ? <p id="pl-paywall-error" role="alert" className="mt-2 text-sm font-semibold text-coral-700">That’s not quite right. Try the sum again.</p> : null}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3"><Button variant="secondary" accent="brand" icon="arrow-left" onClick={onClose}>Not now, go to activities</Button></div>
          </div>
        </div>
        <span className="sr-only">Available to play: {freeNames.join(', ')}</span>
      </motion.div>
    </div>
  );
}
