"use client";

import dynamic from "next/dynamic";import PromptModal from "@/components/PromptModal";
import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

const HighlightSurface = dynamic(() => import("@/components/HighlightSurface"), { ssr: false });
const FloatingAction  = dynamic(() => import("@/components/FloatingAction"),  { ssr: false });

const SAMPLES: string[] = [
  "In negligence, duty -> breach -> causation -> damages.",
  "For injunctions, plaintiffs must show (1) likelihood of success, (2) irreparable harm, (3) balance of equities, and (4) public interest.",
  "Offer -> Acceptance -> Consideration -> Contract Formation.",
  "Mens rea, actus reus, and causation must be proven beyond a reasonable doubt.",
  "Standing requires injury-in-fact, traceability, and redressability.",
  "Rule: Subject-matter jurisdiction -> personal jurisdiction -> venue -> service."
];


type NodeT = { id: string; label: string; kind?: string };
type EdgeT = { from: string; to: string; label?: string };
type SpecT = { chartType: "flowchart" | "rulemap" | "timeline"; nodes: NodeT[]; edges: EdgeT[] };


function InlineChartPreview({ spec }: { spec: SpecT }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 16 }}>
      {spec.nodes.map((n, i) => (
        <React.Fragment key={n.id}>
          <div
            style={{
              minWidth: 280,
              maxWidth: 720,
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "12px 16px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              background: "#fff",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4, color: "#475569" }}>
              {n.kind ?? "step"}
            </div>
            <div style={{ fontWeight: 600, lineHeight: 1.35, color: "#0f172a" }}>
              {n.label}
            </div>
          </div>
          {i < spec.nodes.length - 1 && (
            <div aria-hidden style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: 2, height: 16, background: "#cbd5e1" }} />
              <div>↓</div>
              <div style={{ width: 2, height: 16, background: "#cbd5e1" }} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}


export default function DemoPage() {
  const [text, setText] = useState("");
  const [pos, setPos] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });

  const [spec, setSpec] = useState<SpecT | null>(null);
  const [error, setError] = useState<string | null>(null);
  

  // modal + loading
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // keep your current default; change later via buttons if you add them
  const [chartType] = useState<"rulemap" | "flowchart" | "timeline">("flowchart");

  const router = useRouter();

  function defaultPromptFor(type: SpecT["chartType"]) {
    return type === "timeline"
        ? "Create a timeline of dated events with brief labels and directional edges for causality."
        : type === "rulemap"
        ? "Create a rule map: elements, tests, standards, exceptions, outcomes. Keep labels concise."
        : "Make a clear flowchart: decisions as diamonds, facts/rules as rectangles, edge labels for conditions.";
    }

  async function previewFrom(textValue: string, prompt = "Make a flowchart") {
    setError(null);
    setSpec(null);
    setLoading(true);
    try {
        const res = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textValue, chartType: "flowchart", prompt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || res.statusText);
        setSpec(data.spec as SpecT);
    } catch (e: any) {
        setError(e?.message ?? "Failed to generate chart");
    } finally {
        setLoading(false);
    }
  }


  async function runLLM(prompt: string) {
    try {
      setLoading(true);
      const res = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, chartType, prompt }), // <-- field is `prompt`
      });
      const data = await res.json();
    //   if (!res.ok) return alert(data.error || "Failed");
      if (!res.ok) throw new Error(data?.error || res.statusText);
    //   alert(`OK: ${data.spec?.nodes?.length ?? 0} nodes`);
      setSpec(data.spec as SpecT);
    } catch (e: any) {
      alert(e?.message ?? "Failed to create chart");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Highlight → Make Chart (Demo)</h1>

      <HighlightSurface
        onSelection={(t, rect) => {
          const clean = t.trim();
          if (clean.length > 0 && rect) {
            setText(clean);
            setPos({ x: rect.left + window.scrollX, y: rect.bottom + window.scrollY + 8, show: true });
          } else {
            setPos((p) => ({ ...p, show: false }));
          }
        }}
      />

      {/* <FloatingAction
        show={pos.show}
        x={pos.x}
        y={pos.y}
        onClick={() => setOpen(true)} // open the prompt modal instead of calling API directly
      /> */}

      <FloatingAction
        show={pos.show}
        x={pos.x}
        y={pos.y}
        onClick={() => {
            if (!text || text.trim().length < 5) {
            setError("Highlight some text first.");
            return;
            }
            const prompt = "Make a chart from the highlighted text. Use concise steps and show clear flow.";
            const url = `/editor?chartType=flowchart&text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(prompt)}`;
            router.push(url);
        }}
        />


      {/* <PromptModal
        open={open}
        loading={loading}
        onClose={() => setOpen(false)}
        onSubmit={runLLM}
        initialPrompt={
          chartType === "timeline"
            ? "Create a timeline of dated events with brief labels and directional edges for causality."
            : chartType === "rulemap"
            ? "Create a rule map: elements, tests, standards, exceptions, outcomes. Keep labels concise."
            : "Make a clear flowchart: decisions as diamonds, facts/rules as rectangles, edge labels for conditions."
        }
      /> */}

      {error && (
        <div style={{ color: "#b91c1c", background: "#fee2e2", padding: 10, borderRadius: 8 }}>
            Error: {error}
        </div>
        )}

       {spec && <InlineChartPreview spec={spec} />}

    </main>
  );
}
