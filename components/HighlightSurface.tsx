// "use client";
// import React, { useRef } from "react";

// type Props = {
//   onSelection: (text: string, rect: DOMRect | null) => void;
// };

// const DEMO_BLOCKS: string[] = [
//   // A) Negligence overview
//   "In negligence, duty, breach, causation, and damages structure liability. Courts often apply a multi-factor test (foreseeability, proximity, policy limits). When multiple prongs are required, each must be satisfied for liability to attach.",
//   // B) Injunctions test
//   "For injunctions, plaintiffs must show (1) likelihood of success, (2) irreparable harm, (3) balance of equities, and (4) public interest. No single factor is dispositive; courts weigh all four in context.",
//   // C) Civil procedure checklist
//   "Civil procedure sequence: subject-matter jurisdiction (federal question or diversity) → personal jurisdiction (minimum contacts + fairness) → venue → service. If any element is missing, dismissal without prejudice may be appropriate.",
//   // D) Contracts formation + SoF
//   "Contract formation generally requires offer, acceptance, and consideration. Under the UCC, firm offers and the mailbox rule may alter timing. The Statute of Frauds requires a signed writing for marriage, year-long contracts, land, executor promises, goods ≥ $500, and suretyship.",
//   // E) Syllabus / course logistics
//   "Syllabus: Week 1—Torts intro (read pp. 1–45); Week 3—Negligence duty/breach (pp. 120–178); Midterm memo due Oct 12 at 11:59pm; Office hours Tue 2–4pm; Final outline (10 pages max) due Dec 6 at 5pm."
// ];

// export default function HighlightSurface({ onSelection }: Props) {
//   const ref = useRef<HTMLDivElement>(null);

//   const handleMouseUp = () => {
//     const sel = window.getSelection();
//     if (!sel || sel.rangeCount === 0) {
//       onSelection("", null);
//       return;
//     }

//     const range = sel.getRangeAt(0);
//     const container = ref.current;
//     const within =
//       !!container &&
//       (container === range.commonAncestorContainer ||
//         container.contains(range.commonAncestorContainer as Node));

//     const text = sel.toString();
//     onSelection(within ? text : "", within ? range.getBoundingClientRect() : null);
//   };

//   return (
//     <section
//       ref={ref}
//       onMouseUp={handleMouseUp}
//       className="rounded-xl border bg-white text-slate-900 p-4 space-y-4 leading-7 select-text"
//     >
//       {DEMO_BLOCKS.map((b, i) => (
//         <p key={i} className="leading-relaxed">
//           {b}
//         </p>
//       ))}
//     </section>
//   );
// }



"use client";

import { useRef } from "react";

export default function HighlightSurface({
  onSelection,
}: {
  onSelection: (text: string, rect: DOMRect | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return onSelection("", null);

    const range = sel.getRangeAt(0);
    const container = ref.current;
    const within =
      !!container &&
      (container.contains(range.commonAncestorContainer) ||
        container === range.commonAncestorContainer);

    const text = sel.toString();
    onSelection(within ? text : "", within ? range.getBoundingClientRect() : null);
  };

  return (
    <section
      ref={ref}
      onMouseUp={handleMouseUp}
      className="rounded-xl border border-slate-700 bg-white/5 p-4 text-slate-100 leading-7 select-text space-y-4"
    >
      <h2 className="text-sm font-semibold text-slate-300">Samples</h2>

      {/* 1) Syllabus milestones (good for timelines) */}
      <article className="rounded-lg border border-slate-700 bg-white/5 p-4">
        <h3 className="text-slate-200 font-semibold">Torts — syllabus milestones</h3>
        <p className="mt-2 text-slate-100">
          Week 1 — Intentional torts (pp. 1–45); Week 2 — Defenses (pp. 46–88);
          Case brief due Sep 24 at 11:59pm; Office hours Thu 2–4pm; Midterm on Oct 12;
          Outline due Nov 30; Final exam Dec 12.
        </p>
      </article>

      {/* 2) Project schedule (good for timelines) */}
      <article className="rounded-lg border border-slate-700 bg-white/5 p-4">
        <h3 className="text-slate-200 font-semibold">Civil-procedure memo — project schedule</h3>
        <p className="mt-2 text-slate-100">
          Project kickoff Sep 23; Jurisdiction research Sep 24–27; Outline due Sep 28;
          First draft Oct 1; Cite-check Oct 3; Peer review Oct 5; Final memo due Oct 7 at 11:59pm.
        </p>
      </article>

      {/* 3) Intake triage (good for flowcharts with decisions) */}
      <article className="rounded-lg border border-slate-700 bg-white/5 p-4">
        <h3 className="text-slate-200 font-semibold">Client intake — triage flow</h3>
        <p className="mt-2 text-slate-100">
          Start with a conflict check. If a conflict exists, decline and refer out.
          If no conflict, send an engagement letter. If the client signs, open the
          matter and schedule kickoff. If no response in 14 days, send a reminder;
          if still no response after 7 more days, close the file.
        </p>
      </article>

      {/* 4) Motion filing workflow (good for flowcharts) */}
      <article className="rounded-lg border border-slate-700 bg-white/5 p-4">
        <h3 className="text-slate-200 font-semibold">Motion filing — workflow</h3>
        <p className="mt-2 text-slate-100">
          Confirm court jurisdiction and venue. If improper, identify the correct court.
          If proper, draft the motion and supporting memorandum. Verify required exhibits
          and affidavits; if missing, obtain them. File through the e-filing system.
          Serve opposing counsel. Calendar the hearing date. Prepare the argument outline.
        </p>
      </article>

      {/* 5) Study plan (good for timelines) */}
      <article className="rounded-lg border border-slate-700 bg-white/5 p-4">
        <h3 className="text-slate-200 font-semibold">Study plan — exam preparation</h3>
        <p className="mt-2 text-slate-100">
          Outline refresh Oct 1–5; Hypos Set A Oct 6; Hypos Set B Oct 9; Past exam review Oct 12;
          Group review Oct 14; Office hours Q&amp;A Oct 16; Final comprehensive review Oct 18;
          Exam on Oct 20.
        </p>
      </article>

      <p className="text-xs text-slate-400">
        Tip: highlight any span of text above, click <span className="font-semibold">Make Chart</span>, then write your
        own instructions in the prompt (e.g., “Make a timeline with one event per node” or “Make a flowchart with decision diamonds and yes/no edges”).
      </p>
    </section>
  );
}
