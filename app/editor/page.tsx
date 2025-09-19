"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// Optional: also force this route to render dynamically (avoids pre-rendering)
// export const dynamic = "force-dynamic";

type NodeT = { id: string; label: string; kind?: string };
type EdgeT = { from: string; to: string; label?: string };
type SpecT = { chartType: "flowchart" | "rulemap" | "timeline"; nodes: NodeT[]; edges: EdgeT[] };

export default function EditorPage() {
  return (
    <Suspense fallback={<EditorLoading />}>
      <EditorClient />
    </Suspense>
  );
}

function EditorLoading() {
  return (
    <main className="min-h-screen bg-[#0b0f17] p-6 grid place-items-center">
      <div className="text-slate-300 text-sm">Loading editor…</div>
    </main>
  );
}

function EditorClient() {
  const search = useSearchParams();
  const router = useRouter();

  const initialText = decodeURIComponent(search.get("text") || "");
  const initialPrompt = decodeURIComponent(search.get("prompt") || "");
  const chartType = ((search.get("chartType") as SpecT["chartType"]) || "flowchart");

  const [text, setText] = useState(initialText);
  const [prompt, setPrompt] = useState(initialPrompt || "Make a clear, step-by-step flowchart.");
  const [spec, setSpec] = useState<SpecT | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    setSpec(null);
    setLoading(true);
    try {
      const res = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, chartType, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);
      setSpec(data.spec as SpecT);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to generate chart";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0f17] p-6 grid gap-4" style={{ gridTemplateRows: "auto 1fr" }}>
      {/* Header */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <button
          onClick={() => router.back()}
          className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100"
        >
          ← Back
        </button>
        <h1 className="text-center text-slate-100 font-extrabold text-xl m-0">Chart Editor</h1>
        <div />
      </div>

      {/* Content */}
      <div className="grid gap-4 md:grid-cols-[minmax(280px,420px)_1fr] items-start">
        {/* Left column: prompt + text + generate */}
        <div className="grid gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-slate-100">
          <label className="grid gap-1">
            <span className="text-xs opacity-80">Prompt</span>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Tell the model how to structure the chart…"
              className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs opacity-80">Source text</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100"
            />
          </label>

          <button
            onClick={generate}
            disabled={loading || !text || text.trim().length < 5}
            className={`px-3 py-2 rounded-lg font-bold border ${
              loading ? "bg-sky-900" : "bg-sky-600 hover:bg-sky-500"
            } border-sky-500 text-slate-100`}
          >
            {loading ? "Generating…" : "Generate"}
          </button>

          {error && <div className="rounded-md bg-rose-900 text-rose-100 px-3 py-2">Error: {error}</div>}
        </div>

        {/* Right column: editable chart */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 min-h-[420px]">
          {spec ? <EditableChart spec={spec} onChange={setSpec} /> : <EmptyState />}
        </div>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="h-full grid place-items-center text-slate-400 text-sm">
      Enter a prompt and click <span className="font-semibold ml-1">Generate</span> to see your chart.
    </div>
  );
}

function EditableChart({
  spec,
  onChange,
}: {
  spec: SpecT;
  onChange: (next: SpecT) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function startEdit(id: string, current: string) { setEditingId(id); setDraft(current); }
  function saveEdit(id: string) {
    const nodes = spec.nodes.map((n) => (n.id === id ? { ...n, label: draft } : n));
    onChange({ ...spec, nodes, edges: rebuildEdges(nodes) });
    setEditingId(null); setDraft("");
  }
  function cancelEdit() { setEditingId(null); setDraft(""); }
  function addNodeBelow(index: number) {
    const newId = `n${spec.nodes.length + 1}`;
    const nodes = [...spec.nodes];
    nodes.splice(index + 1, 0, { id: newId, label: "New step" });
    onChange({ ...spec, nodes, edges: rebuildEdges(nodes) });
  }
  function deleteNode(id: string) {
    const nodes = spec.nodes.filter((n) => n.id !== id);
    onChange({ ...spec, nodes, edges: rebuildEdges(nodes) });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {spec.nodes.map((n, i) => (
        <React.Fragment key={n.id}>
          <div className="min-w-[360px] max-w-[820px] rounded-xl border border-slate-700 bg-[#111827] text-slate-100 p-3 shadow">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-slate-400">{n.kind ?? "step"}</div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(n.id, n.label)} className={iconBtn}>✏️</button>
                <button onClick={() => addNodeBelow(i)} className={iconBtn}>⊕</button>
                <button onClick={() => deleteNode(n.id)} className={iconBtn}>🗑</button>
              </div>
            </div>

            {editingId === n.id ? (
              <div className="grid gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100"
                />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(n.id)} className={primaryBtn}>Save</button>
                  <button onClick={cancelEdit} className={ghostBtn}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="font-bold leading-tight">{n.label}</div>
            )}
          </div>

          {i < spec.nodes.length - 1 && (
            <div aria-hidden className="flex flex-col items-center gap-1">
              <div className="w-[2px] h-4 bg-slate-700" />
              <div className="text-slate-400">↓</div>
              <div className="w-[2px] h-4 bg-slate-700" />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function rebuildEdges(nodes: NodeT[]): EdgeT[] {
  const edges: EdgeT[] = [];
  for (let i = 0; i < nodes.length - 1; i++) edges.push({ from: nodes[i].id, to: nodes[i + 1].id, label: "next" });
  return edges;
}

const iconBtn = "px-2 py-1 rounded-lg border border-slate-700 bg-slate-900 text-slate-100";
const primaryBtn = "px-3 py-2 rounded-lg font-bold border border-sky-500 bg-sky-600 text-slate-100";
const ghostBtn = "px-3 py-2 rounded-lg border border-slate-700 text-slate-100";
