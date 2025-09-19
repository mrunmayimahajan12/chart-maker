"use client";
import React, { useRef } from "react";

type Props = {
  onSelection: (text: string, rect: DOMRect | null) => void;
};

const DEMO_BLOCKS: string[] = [
  // A) Negligence overview
  "In negligence, duty, breach, causation, and damages structure liability. Courts often apply a multi-factor test (foreseeability, proximity, policy limits). When multiple prongs are required, each must be satisfied for liability to attach.",
  // B) Injunctions test
  "For injunctions, plaintiffs must show (1) likelihood of success, (2) irreparable harm, (3) balance of equities, and (4) public interest. No single factor is dispositive; courts weigh all four in context.",
  // C) Civil procedure checklist
  "Civil procedure sequence: subject-matter jurisdiction (federal question or diversity) → personal jurisdiction (minimum contacts + fairness) → venue → service. If any element is missing, dismissal without prejudice may be appropriate.",
  // D) Contracts formation + SoF
  "Contract formation generally requires offer, acceptance, and consideration. Under the UCC, firm offers and the mailbox rule may alter timing. The Statute of Frauds requires a signed writing for marriage, year-long contracts, land, executor promises, goods ≥ $500, and suretyship.",
  // E) Syllabus / course logistics
  "Syllabus: Week 1—Torts intro (read pp. 1–45); Week 3—Negligence duty/breach (pp. 120–178); Midterm memo due Oct 12 at 11:59pm; Office hours Tue 2–4pm; Final outline (10 pages max) due Dec 6 at 5pm."
];

export default function HighlightSurface({ onSelection }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      onSelection("", null);
      return;
    }

    const range = sel.getRangeAt(0);
    const container = ref.current;
    const within =
      !!container &&
      (container === range.commonAncestorContainer ||
        container.contains(range.commonAncestorContainer as Node));

    const text = sel.toString();
    onSelection(within ? text : "", within ? range.getBoundingClientRect() : null);
  };

  return (
    <section
      ref={ref}
      onMouseUp={handleMouseUp}
      className="rounded-xl border bg-white text-slate-900 p-4 space-y-4 leading-7 select-text"
    >
      {DEMO_BLOCKS.map((b, i) => (
        <p key={i} className="leading-relaxed">
          {b}
        </p>
      ))}
    </section>
  );
}
