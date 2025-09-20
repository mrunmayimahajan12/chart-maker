import { NextRequest } from "next/server";

/* ── Types ─────────────────────────────────────────────────────────────── */
type ChartType = "rulemap" | "flowchart" | "timeline";
type NodeKind = "start" | "process" | "decision" | "end";
type JNode = { id: string; label: string; type?: NodeKind };
type JEdge = { from: string; to: string; label?: string };
type JGraph = { direction?: "TD" | "LR" | "BT" | "RL"; nodes: JNode[]; edges: JEdge[] };

type SpecNode = { id?: string; label: string; kind?: string };
type SpecEdge = { from: string; to: string; label?: string };
type ChartSpec = { chartType: ChartType; nodes: SpecNode[]; edges: SpecEdge[] };

type GroqResponse = { choices?: Array<{ message?: { content?: string } }> };

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;

function bad(status: number, error: string, extra?: unknown) {
  return Response.json({ error, ...(extra ? { details: extra } : {}) }, { status });
}

/* ── Linear last-resort splitter ───────────────────────────────────────── */
function normalizeText(s: string) { return s.replace(/[—–]/g, "-").replace(/[⇒→]/g, "->").trim(); }
function extractNumberedEnum(s: string): string[] {
  const out: string[] = [];
  const re = /\(\s*\d+\s*\)\s*([^()]+?)(?=(?:\(\s*\d+\s*\)|[.;\n]|$))/g;
  let m: RegExpExecArray | null; while ((m = re.exec(s)) !== null) out.push(m[1].trim());
  return out.filter(Boolean);
}
function splitIntoSteps(text: string): string[] {
  const s = normalizeText(text);
  const arrows = s.split(/\s*(?:->|=>)\s*/g).map(t => t.trim()).filter(Boolean);
  if (arrows.length > 1) return arrows;
  const nums = extractNumberedEnum(s); if (nums.length >= 2) return nums;
  const sentences = s.split(/[.;\n]+/g).map(t => t.trim()).filter(Boolean); if (sentences.length >= 2) return sentences;
  const commas = s.split(/\s*,\s*/g).map(t => t.trim()).filter(Boolean);
  return commas.length ? commas : [s];
}
function toSpecFlow(parts: string[], chartType: ChartType): ChartSpec {
  const nodes = parts.slice(0, 30).map((p, i) => ({ id: `n${i + 1}`, label: p.length > 80 ? p.slice(0, 77) + "…" : p }));
  const edges = nodes.slice(0, -1).map((n, i) => ({ from: n.id!, to: nodes[i + 1].id!, label: chartType === "timeline" ? "then" : "next" }));
  return { chartType, nodes, edges };
}

/* ── Mermaid helpers ───────────────────────────────────────────────────── */
function mermaidFlowFromGraph(g: JGraph): string {
  const dir = g.direction ?? "TD";
  const esc = (s: string) => s.replace(/"/g, '\\"');
  const lines: string[] = [`flowchart ${dir}`];
  for (const n of g.nodes) {
    const id = n.id, label = esc(n.label);
    let shape = `["${label}"]`;
    if (n.type === "decision") shape = `{${label}}`;
    else if (n.type === "start" || n.type === "end") shape = `(["${label}"])`;
    lines.push(`  ${id}${shape}`);
  }
  for (const e of g.edges) {
    const lbl = e.label ? `|${esc(e.label)}|` : "";
    lines.push(`  ${e.from} -->${lbl} ${e.to}`);
  }
  return lines.join("\n");
}
function specToMermaid(spec: ChartSpec): string {
  if (spec.chartType === "timeline") {
    const rows = spec.nodes.map(n => `    ${n.label}`).join("\n");
    return `timeline\n    title Generated Timeline\n${rows || "    Start"}`;
  }
  const esc = (s: string) => s.replace(/"/g, '\\"');
  const lines = ["flowchart TD"];
  for (const n of spec.nodes) lines.push(`  ${n.id}["${esc(n.label)}"]`);
  for (const e of spec.edges) {
    const lbl = e.label ? `|${e.label.replace(/\|/g, "/")}|` : "";
    lines.push(`  ${e.from} -->${lbl} ${e.to}`);
  }
  return lines.join("\n");
}
function extractMermaidBlock(s: string): string | null {
  const fence = s.match(/```mermaid\s*([\s\S]*?)```/i); if (fence) return fence[1].trim();
  const m = s.match(/^\s*(flowchart|graph|timeline)\b[\s\S]*$/i);
  return m ? m[0].trim() : null;
}
function mermaidToSpec(code: string): ChartSpec {
  const isTimeline = /^timeline\b/i.test(code);
  const nodes: SpecNode[] = []; const edges: SpecEdge[] = [];
  if (isTimeline) {
    const lines = code.split("\n").map(l => l.trim());
    for (const line of lines.slice(1)) { if (!line || /^title\b/i.test(line)) continue; nodes.push({ id: `n${nodes.length + 1}`, label: line }); }
    for (let i = 0; i < nodes.length - 1; i++) edges.push({ from: nodes[i].id!, to: nodes[i + 1].id!, label: "then" });
    return { chartType: "timeline", nodes, edges };
  }
  const idLabel = new Map<string, string>();
  code.split("\n").forEach(l => {
    const n = l.match(/^\s*([a-zA-Z0-9_]+)\s*(?:\[\s*"?(.*?)"?\s*\]|\{\s*"?(.+?)"?\s*\}|\(\[\s*"?(.*?)"?\s*\]\))/);
    if (n) { const id = n[1]; const lbl = (n[2] || n[3] || n[4] || "").trim(); if (id && lbl) idLabel.set(id, lbl); }
    const e = l.match(/^\s*([a-zA-Z0-9_]+)\s*-->(?:\|(.+?)\|)?\s*([a-zA-Z0-9_]+)/);
    if (e) edges.push({ from: e[1], to: e[3], label: e[2]?.trim() });
  });
  idLabel.forEach((label, id) => nodes.push({ id, label }));
  return { chartType: "flowchart", nodes, edges };
}

/* ── Hinting ───────────────────────────────────────────────────────────── */
function inferHint(paramType?: ChartType, promptText?: string): ChartType {
  if (paramType && ["flowchart", "rulemap", "timeline"].includes(paramType)) return paramType;
  const p = (promptText ?? "").toLowerCase();
  if (/\btimeline|chronolog|schedule/i.test(p)) return "timeline";
  return "flowchart";
}

/* ── LLM: JSON graph (primary) ─────────────────────────────────────────── */
async function callGroqForGraphJSON(text: string, hint: ChartType, userPrompt?: string): Promise<JGraph | null> {
  const apiKey = process.env.GROQ_API_KEY; if (!apiKey) return null;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const system =
    "Extract a flowchart as JSON. Return ONLY valid JSON (no prose, no fences).\n" +
    "Schema: { direction?: 'TD'|'LR'|'BT'|'RL', nodes: [{id,label,type?('start'|'process'|'decision'|'end')}], edges: [{from,to,label?}] }\n" +
    "Rules:\n" +
    "- Make decision nodes for conditionals (sentences starting with 'If').\n" +
    "- Each decision must have >=2 outgoing labeled edges (e.g., 'yes'/'no').\n" +
    "- Keep labels <=80 chars; keep parentheses in the same node.\n" +
    "- Ensure all edges reference existing node ids and the graph is connected.\n" +
    "- Default direction: " + (hint === "timeline" ? "TD" : "TD") + ".";

  const user =
    (userPrompt ? "PROMPT: " + userPrompt + "\n" : "") +
    "TEXT:\n" + text.replace(/\s+/g, " ").trim();

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model, temperature: 0.1, max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) return null;

  const data = (await res.json().catch(() => null)) as GroqResponse | null;
  const content = data?.choices?.[0]?.message?.content ?? "";
  // Accept bare JSON or ```json fenced
  const fenced = content.match(/```json\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : content.trim();

  let parsed: unknown;
  try { parsed = JSON.parse(jsonText); } catch { return null; }
  if (!isObj(parsed)) return null;

  const nodes = Array.isArray((parsed as any).nodes) ? ((parsed as any).nodes as JNode[]) : [];
  const edges = Array.isArray((parsed as any).edges) ? ((parsed as any).edges as JEdge[]) : [];
  if (!nodes.length || !edges.length) return null;

  // Clean + repair
  const seen = new Set<string>();
  const cleanNodes: JNode[] = [];
  for (const n of nodes) {
    if (!n?.id || !n?.label) continue;
    if (seen.has(n.id)) continue;
    cleanNodes.push({ id: String(n.id), label: String(n.label), type: n.type as NodeKind | undefined });
    seen.add(n.id);
  }
  const idSet = new Set(cleanNodes.map(n => n.id));
  const cleanEdges: JEdge[] = edges
    .filter(e => e?.from && e?.to && idSet.has(String(e.from)) && idSet.has(String(e.to)))
    .map(e => ({ from: String(e.from), to: String(e.to), label: e.label ? String(e.label).slice(0, 40) : undefined }));

  // Repair decisions: ensure >=2 labeled outs
  const outIdxMap = new Map<string, number[]>();
  cleanEdges.forEach((e, i) => outIdxMap.set(e.from, [...(outIdxMap.get(e.from) || []), i]));
  for (const n of cleanNodes) {
    if (n.type !== "decision") continue;
    const idxs = outIdxMap.get(n.id) || [];
    const labels = ["yes", "no", "alt3", "alt4"];
    idxs.forEach((ei, k) => { if (!cleanEdges[ei].label?.trim()) cleanEdges[ei].label = labels[Math.min(k, labels.length - 1)]; });
    if (idxs.length < 2) {
      const elseId = n.id + "_else";
      cleanNodes.push({ id: elseId, label: "Otherwise", type: "process" });
      cleanEdges.push({ from: n.id, to: elseId, label: "no" });
    }
  }

  return { direction: (parsed as any).direction ?? "TD", nodes: cleanNodes, edges: cleanEdges };
}

/* ── Heuristic brancher (no LLM) ───────────────────────────────────────── */
function heuristicGraphFromText(text: string): JGraph | null {
  const cleaned = text.replace(/\n+/g, " ").trim();
  const sentences = cleaned.split(/(?<=[.!?;])\s+/).map(s => s.trim()).filter(Boolean);
  if (!sentences.length) return null;

  const nodes: JNode[] = []; const edges: JEdge[] = [];
  let id = 1; const nid = () => "n" + id++;
  const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const negRe = /\b(no|not|without|fails?|does\s*not|doesn['’]t|none)\b/i;

  let cursor: string | null = null;
  let pending: { id: string } | null = null;

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];

    const m = s.match(/^if\s+([^,]+),\s*(.+)$/i);
    if (m) {
      const cond = cap(m[1].trim());
      const action = cap(m[2].trim());

      // If this "if" contains negation and we have a pending decision, treat as "no" branch
      if (pending && negRe.test(s)) {
        const nId = nid();
        nodes.push({ id: nId, label: action, type: "process" });
        edges.push({ from: pending.id, to: nId, label: "no" });
        cursor = nId;
        pending = null;
        continue;
      }

      // Start a new decision + YES branch
      const d: string = pending?.id ?? nid();
      if (!pending) {
        nodes.push({ id: d, label: "If " + cond, type: "decision" });
        if (cursor) edges.push({ from: cursor, to: d });
      }
      const y = nid();
      nodes.push({ id: y, label: action, type: "process" });
      edges.push({ from: d, to: y, label: "yes" });
      cursor = y;
      pending = { id: d };
      continue;
    }

    // Plain step
    const p = nid();
    nodes.push({ id: p, label: cap(s), type: "process" });
    if (cursor) edges.push({ from: cursor, to: p });
    cursor = p;
  }

  if (!nodes.length) return null;
  return { direction: "TD", nodes, edges };
}

/* ── LLM: Mermaid (secondary) ──────────────────────────────────────────── */
async function callGroqForMermaid(text: string, hint: ChartType, userPrompt?: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY; if (!apiKey) return null;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const system =
    "Create a Mermaid diagram. Return Mermaid code ONLY (prefer a ```mermaid code fence```).\n" +
    "For flowcharts: use {label} for decisions (with two labeled outgoing edges) and [label] for steps. Keep labels concise (<=80 chars).";
  const user = "HINT: " + hint + (userPrompt ? "\nPROMPT: " + userPrompt : "") + "\nTEXT:\n" + text.replace(/\s+/g, " ").trim();

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, temperature: 0.2, max_tokens: 1000, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!res.ok) return null;

  const data = (await res.json().catch(() => null)) as GroqResponse | null;
  const content = data?.choices?.[0]?.message?.content ?? "";
  const code = extractMermaidBlock(content);
  if (!code) return null;
  if (!/^(flowchart|graph|timeline)\b/i.test(code)) return null;
  return code;
}

/* ── Route ─────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return bad(400, "Content-Type must be application/json");

    const body = (await req.json().catch(() => null)) as { text?: string; chartType?: ChartType; prompt?: string; llmOnly?: boolean } | null;
    if (!body || typeof body !== "object") return bad(400, "Malformed JSON body");

    const text = asString(body.text);
    if (text.trim().length < 5) return bad(400, "Missing or too-short 'text' (>=5 chars required)");

    const hint = inferHint(body.chartType, body.prompt);
    const prompt = asString(body.prompt);
    const llmOnly = Boolean(body.llmOnly);

    // 1) LLM → JSON graph (preferred)
    const g = await callGroqForGraphJSON(text, hint, prompt);
    if (g) {
      const mermaid = mermaidFlowFromGraph(g);
      const spec: ChartSpec = { chartType: "flowchart", nodes: g.nodes.map(n => ({ id: n.id, label: n.label, kind: n.type })), edges: g.edges };
      return Response.json({ spec, mermaid, info: { usedPrompt: !!prompt, usedLLM: true, path: "llm-json→compile" } }, { status: 200 });
    }
    if (llmOnly) return bad(502, "LLM_JSON_FAILED");

    // 2) Heuristic brancher (no LLM) — catches “If … / If no …”
    const h = heuristicGraphFromText(text);
    if (h) {
      const mermaid = mermaidFlowFromGraph(h);
      const spec: ChartSpec = { chartType: "flowchart", nodes: h.nodes.map(n => ({ id: n.id, label: n.label, kind: n.type })), edges: h.edges };
      return Response.json({ spec, mermaid, info: { usedPrompt: !!prompt, usedLLM: false, path: "heuristic-brancher" } }, { status: 200 });
    }

    // 3) LLM → Mermaid (legacy)
    const m = await callGroqForMermaid(text, hint, prompt);
    if (m) {
      const spec = mermaidToSpec(m);
      return Response.json({ spec, mermaid: m, info: { usedPrompt: !!prompt, usedLLM: true, path: "llm-mermaid" } }, { status: 200 });
    }
    if (llmOnly) return bad(502, "LLM_MERMAID_FAILED");

    // 4) Linear fallback
    const parts = splitIntoSteps(text);
    const spec = toSpecFlow(parts, hint);
    const mermaid = specToMermaid(spec);
    return Response.json({ spec, mermaid, info: { usedPrompt: !!prompt, usedLLM: false, path: "fallback-spec2mermaid" } }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return bad(500, msg);
  }
}



