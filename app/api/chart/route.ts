// import { NextRequest } from "next/server";

// type ChartType = "rulemap" | "flowchart" | "timeline";
// type Node = { id: string; label: string; kind?: string };
// type Edge = { from: string; to: string; label?: string };
// type ChartSpec = { nodes: Node[]; edges: Edge[]; chartType: ChartType };

// function bad(status: number, error: string, extra?: unknown) {
//   return Response.json({ error, ...(extra ? { details: extra } : {}) }, { status });
// }

// /** Normalize arrows/dashes and strip context prefixes like "In negligence, ..." */
// function normalizeText(raw: string) {
//   let s = raw.replace(/[—–]/g, "-").replace(/[⇒→]/g, "->").trim();
//   s = s.replace(/^\s*(?:in|under)\s+[^,]+,\s*/i, ""); // drop leading context
//   return s;
// }

// function extractNumberedEnum(s: string): string[] {
//   // Matches: (1) itemA, (2) itemB, (3) itemC ...
//   const items: string[] = [];
//   const re = /\(\s*\d+\s*\)\s*([^()]+?)(?=(?:\(\s*\d+\s*\)|[.;\n]|$))/g;
//   let m: RegExpExecArray | null;
//   while ((m = re.exec(s)) !== null) {
//     const item = m[1].trim().replace(/^[,:-]\s*/, "").replace(/\s+(?:and|or)\s*$/, "");
//     if (item) items.push(item);
//   }
//   return items;
// }

// function extractCommaAndList(s: string): string[] {
//   // Matches: X, Y, Z, and W  (generic, not hard-coded to negligence)
//   const m = s.match(/([A-Za-z][\w -]*?(?:,\s*[A-Za-z][\w -]*){2,})\s*,?\s*(?:and\s+([A-Za-z][\w -]*))/i);
//   if (!m) return [];
//   const head = m[1];
//   const last = m[2];
//   const parts = head.split(/\s*,\s*/).map(t => t.trim()).filter(Boolean);
//   if (last) parts.push(last.trim());
//   // sanity check: looks like a short list of items (not full sentences)
//   if (parts.length >= 3 && parts.every(p => p.length <= 60 && !/[.;]/.test(p))) return parts;
//   return [];
// }

// function splitIntoSteps(text: string): string[] {
//   const s = normalizeText(text);

//   // 1) Arrow chains: A -> B -> C
//   const arrowParts = s.split(/\s*(?:->|=>)\s*/g).map(x => x.trim()).filter(Boolean);
//   if (arrowParts.length > 1) return arrowParts;

//   // 2) Numbered enumerations: (1) A, (2) B, ...
//   const numEnum = extractNumberedEnum(s);
//   if (numEnum.length >= 2) return numEnum;

//   // 3) Parenthesized lists: (..., ..., ...) — e.g., factors inside parentheses
//   const parenMatch = s.match(/\(([^()]+)\)/);
//   if (parenMatch) {
//     const parts = parenMatch[1].split(/\s*,\s*/).map(x => x.trim()).filter(Boolean);
//     if (parts.length >= 2 && parts.every(p => p.length <= 60)) return parts;
//   }

//   // 4) Comma + 'and' lists: X, Y, Z, and W
//   const commaAnd = extractCommaAndList(s);
//   if (commaAnd.length >= 3) return commaAnd;

//   // 5) Plain short comma-lists
//   const commaParts = s.split(/\s*,\s*/g).map(x => x.trim()).filter(Boolean);
//   if (commaParts.length >= 2 && commaParts.every(p => p.length <= 60)) return commaParts;

//   // 6) Fallback: sentences/lines
//   const sentenceParts = s.split(/[.;\n]+/g).map(x => x.trim()).filter(Boolean);
//   return sentenceParts.length ? sentenceParts : [s];
// }

// /** Split into ordered steps (arrows > comma-lists > sentences/lines) */
// // function splitIntoSteps(text: string): string[] {
// //   const s = normalizeText(text);

// //   const arrowParts = s.split(/\s*(?:->|=>)\s*/g).map(x => x.trim()).filter(Boolean);
// //   if (arrowParts.length > 1) return arrowParts;

// //   const commaParts = s.split(/\s*,\s*/g).map(x => x.trim()).filter(Boolean);
// //   if (commaParts.length >= 2 && commaParts.every(p => p.length <= 60)) return commaParts;

// //   const sentenceParts = s.split(/[.;\n]+/g).map(x => x.trim()).filter(Boolean);
// //   return sentenceParts.length ? sentenceParts : [s];
// // }

// function toSpecFlow(parts: string[], chartType: ChartType): ChartSpec {
//   const capped = parts.slice(0, 25);
//   const nodes: Node[] = capped.map((p, i) => ({
//     id: `n${i + 1}`,
//     label: p.length > 80 ? p.slice(0, 77) + "…" : p,
//     ...(chartType === "flowchart" && /\b(if|whether|must|test|require)\b/i.test(p)
//       ? { kind: "decision" as const }
//       : {}),
//   }));

//   const edges: Edge[] = [];
//   for (let i = 0; i < nodes.length - 1; i++) {
//     edges.push({ from: nodes[i].id, to: nodes[i + 1].id, label: chartType === "timeline" ? "then" : "next" });
//   }

//   return { chartType, nodes, edges };
// }

// export async function POST(req: NextRequest) {
//   try {
//     const ct = req.headers.get("content-type") || "";
//     if (!ct.includes("application/json")) return bad(400, "Content-Type must be application/json");

//     const body = await req.json().catch(() => null);
//     if (!body || typeof body !== "object") return bad(400, "Malformed JSON body");

//     const { text, chartType = "flowchart", prompt } = body as {
//       text?: string;
//       chartType?: ChartType;
//       prompt?: string;
//     };

//     if (typeof text !== "string" || text.trim().length < 5) {
//       return bad(400, "Missing or too-short 'text' (>=5 chars required)");
//     }
//     if (!["rulemap", "flowchart", "timeline"].includes(chartType)) {
//       return bad(400, "Invalid 'chartType'. Use 'rulemap' | 'flowchart' | 'timeline'");
//     }
//     if (prompt && typeof prompt !== "string") return bad(400, "'prompt' must be a string if provided");

//     const parts = splitIntoSteps(text);
//     const spec = toSpecFlow(parts, chartType as ChartType);

//     return Response.json({ spec, info: { usedPrompt: !!prompt } }, { status: 200 });
//   } catch (err) {
//     console.error("POST /api/chart error:", err);
//     return bad(500, "Internal server error");
//   }
// }

// ---------------------------------------------------------------------------------------------------------

// import { NextRequest } from "next/server";

// /* ────────────────────────────────────────────────────────────────────────────
//    Types
// ──────────────────────────────────────────────────────────────────────────── */
// type ChartType = "rulemap" | "flowchart" | "timeline";
// type Node = { id?: string; label: string; kind?: string };
// type Edge = { from: string; to: string; label?: string };
// type ChartSpec = { nodes: Node[]; edges: Edge[]; chartType: ChartType };

// function bad(status: number, error: string, extra?: unknown) {
//   return Response.json({ error, ...(extra ? { details: extra } : {}) }, { status });
// }

// /* ────────────────────────────────────────────────────────────────────────────
//    Deterministic fallback (split → linear flow)
// ──────────────────────────────────────────────────────────────────────────── */
// function normalizeText(raw: string) {
//   let s = raw.replace(/[—–]/g, "-").replace(/[⇒→]/g, "->").trim();
//   s = s.replace(/^\s*(?:in|under)\s+[^,]+,\s*/i, "");
//   s = s.replace(/\s+(must\s+be|are|is|shall\s+be|need\s+to\s+be)\s+.+$/i, "");
//   return s;
// }
// function extractNumberedEnum(s: string): string[] {
//   const items: string[] = [];
//   const re = /\(\s*\d+\s*\)\s*([^()]+?)(?=(?:\(\s*\d+\s*\)|[.;\n]|$))/g;
//   let m: RegExpExecArray | null;
//   while ((m = re.exec(s)) !== null) {
//     const item = m[1].trim().replace(/^[,:-]\s*/, "").replace(/\s+(?:and|or)\s*$/, "");
//     if (item) items.push(item);
//   }
//   return items;
// }
// function extractCommaAndList(s: string): string[] {
//   const m = s.match(/([A-Za-z][\w -]*?(?:,\s*[A-Za-z][\w -]*){2,})\s*,?\s*(?:and\s+([A-Za-z][\w -]*))/i);
//   if (!m) return [];
//   const head = m[1].split(/\s*,\s*/).map((t) => t.trim());
//   const last = m[2]?.trim();
//   const parts = [...head, ...(last ? [last] : [])].filter(Boolean);
//   return parts.length >= 3 && parts.every((p) => p.length <= 60 && !/[.;]/.test(p)) ? parts : [];
// }
// function splitIntoSteps(text: string): string[] {
//   const s = normalizeText(text);

//   const arrows = s.split(/\s*(?:->|=>)\s*/g).map((x) => x.trim()).filter(Boolean);
//   if (arrows.length > 1) return arrows;

//   const nums = extractNumberedEnum(s);
//   if (nums.length >= 2) return nums;

//   const paren = s.match(/\(([^()]+)\)/);
//   if (paren) {
//     const parts = paren[1].split(/\s*,\s*/).map((x) => x.trim()).filter(Boolean);
//     if (parts.length >= 2 && parts.every((p) => p.length <= 60)) return parts;
//   }

//   const commaAnd = extractCommaAndList(s);
//   if (commaAnd.length >= 3) return commaAnd;

//   const commas = s.split(/\s*,\s*/g).map((x) => x.trim()).filter(Boolean);
//   if (commas.length >= 2 && commas.every((p) => p.length <= 60)) return commas;

//   const sentences = s.split(/[.;\n]+/g).map((x) => x.trim()).filter(Boolean);
//   return sentences.length ? sentences : [s];
// }
// function toSpecFlow(parts: string[], chartType: ChartType): ChartSpec {
//   const capped = parts.slice(0, 25);
//   const nodes: Node[] = capped.map((p, i) => ({
//     id: `n${i + 1}`,
//     label: p.length > 80 ? p.slice(0, 77) + "…" : p,
//     ...(chartType === "flowchart" && /\b(if|whether|must|test|require)\b/i.test(p) ? { kind: "decision" } : {}),
//   }));
//   const edges: Edge[] = [];
//   for (let i = 0; i < nodes.length - 1; i++) {
//     edges.push({ from: nodes[i].id!, to: nodes[i + 1].id!, label: chartType === "timeline" ? "then" : "next" });
//   }
//   return { chartType, nodes, edges };
// }

// /* ────────────────────────────────────────────────────────────────────────────
//    LLM integration (Groq) + robust normalization
// ──────────────────────────────────────────────────────────────────────────── */
// async function callGroqChart(text: string, chartType: ChartType, userPrompt?: string): Promise<ChartSpec | null> {
//   const apiKey = process.env.GROQ_API_KEY;
//   if (!apiKey) return null;

//   const model = process.env.GROQ_MODEL || "llama-3.1-70b-versatile";

//   const system = [
//     "You are a charting assistant for law students.",
//     "Return a JSON object ONLY with this schema:",
//     '{ "chartType": "flowchart|rulemap|timeline", "nodes":[{"id":"n1","label":"string","kind":"optional"}], "edges":[{"from":"n1","to":"n2","label":"optional"}] }',
//     "Rules: concise labels (<=80 chars); use sequential edges unless branching is explicit; no prose around JSON.",
//   ].join("\n");

//   const user = [
//     `CHART_TYPE: ${chartType}`,
//     userPrompt ? `PROMPT: ${userPrompt}` : "",
//     "TEXT:",
//     text,
//     "",
//     "Return JSON only.",
//   ].join("\n");

//   const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
//     method: "POST",
//     headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
//     body: JSON.stringify({
//       model,
//       temperature: 0.2,
//       max_tokens: 1200,
//       messages: [
//         { role: "system", content: system },
//         { role: "user", content: user },
//       ],
//     }),
//   });

//   if (!res.ok) return null;

//   const data: unknown = await res.json().catch(() => null);
//   const content =
//     typeof data === "object" && data !== null
//       ? (data as any)?.choices?.[0]?.message?.content ?? ""
//       : "";

//   const parsed = extractJson(content);
//   if (!parsed) return null;

//   return normalizeToSpec(parsed, chartType);
// }

// function extractJson(s: string): unknown | null {
//   try {
//     return JSON.parse(s);
//   } catch {
//     /* fallthrough */
//   }
//   const match = s.match(/\{[\s\S]*\}/);
//   if (!match) return null;
//   try {
//     return JSON.parse(match[0]);
//   } catch {
//     return null;
//   }
// }

// /* Helpers to keep TS happy */
// function isRecord(v: unknown): v is Record<string, unknown> {
//   return typeof v === "object" && v !== null;
// }
// function asString(v: unknown): string {
//   return typeof v === "string" ? v : "";
// }

// function normalizeToSpec(obj: unknown, fallbackType: ChartType): ChartSpec {
//   const o = isRecord(obj) ? obj : {};
//   const nodesIn = Array.isArray((o as any).nodes) ? ((o as any).nodes as unknown[]) : [];
//   const edgesIn = Array.isArray((o as any).edges) ? ((o as any).edges as unknown[]) : [];

//   // Nodes (build concrete Node[], no nulls/undefined)
//   const nodes: Node[] = [];
//   nodesIn.forEach((n, i) => {
//     const r = isRecord(n) ? n : {};
//     const label = asString(r["label"]).trim().slice(0, 80);
//     if (!label) return;
//     const id = (asString(r["id"]).trim() || `n${i + 1}`);
//     const kindRaw = asString((r as any)["kind"]).trim();
//     const node: Node = { id, label };
//     if (kindRaw) node.kind = kindRaw;
//     nodes.push(node);
//   });
//   if (nodes.length === 0) nodes.push({ id: "n1", label: "Start" });

//   // Edges (only push valid edges that reference known node IDs)
//   const edges: Edge[] = [];
//   edgesIn.forEach((e) => {
//     const r = isRecord(e) ? e : {};
//     const from = asString(r["from"]).trim();
//     const to = asString(r["to"]).trim();
//     const label = asString(r["label"]).trim();
//     if (!from || !to) return;
//     if (!nodes.some((n) => n.id === from) || !nodes.some((n) => n.id === to)) return;
//     const edge: Edge = { from, to };
//     if (label) edge.label = label;
//     edges.push(edge);
//   });

//   if (edges.length === 0 && nodes.length > 1) {
//     for (let i = 0; i < nodes.length - 1; i++) {
//       edges.push({ from: nodes[i].id!, to: nodes[i + 1].id!, label: fallbackType === "timeline" ? "then" : "next" });
//     }
//   }

//   const typeRaw = asString((o as any).chartType);
//   const type: ChartType = (["rulemap", "flowchart", "timeline"] as const).includes(typeRaw as ChartType)
//     ? (typeRaw as ChartType)
//     : fallbackType;

//   return { chartType: type, nodes, edges };
// }

// /* ────────────────────────────────────────────────────────────────────────────
//    Route
// ──────────────────────────────────────────────────────────────────────────── */
// export async function POST(req: NextRequest) {
//   try {
//     const ct = req.headers.get("content-type") || "";
//     if (!ct.includes("application/json")) return bad(400, "Content-Type must be application/json");

//     const body = (await req.json().catch(() => null)) as
//       | { text?: string; chartType?: ChartType; prompt?: string }
//       | null;

//     if (!body || typeof body !== "object") return bad(400, "Malformed JSON body");

//     const text = typeof body.text === "string" ? body.text : "";
//     const chartType: ChartType =
//       body.chartType && ["rulemap", "flowchart", "timeline"].includes(body.chartType)
//         ? (body.chartType as ChartType)
//         : "flowchart";
//     const prompt = typeof body.prompt === "string" ? body.prompt : undefined;

//     if (text.trim().length < 5) return bad(400, "Missing or too-short 'text' (>=5 chars required)");

//     // 1) Try LLM
//     let spec = await callGroqChart(text, chartType, prompt);

//     // 2) Fallback if LLM unavailable or returned junk
//     if (!spec) {
//       const parts = splitIntoSteps(text);
//       spec = toSpecFlow(parts, chartType);
//     }

//     return Response.json({ spec, info: { usedPrompt: !!prompt, usedLLM: !!process.env.GROQ_API_KEY } }, { status: 200 });
//   } catch (e: unknown) {
//     const msg = e instanceof Error ? e.message : "Internal server error";
//     return bad(500, msg);
//   }
// }




import { NextRequest } from "next/server";

/* ── Types ───────────────────────────────────────────────────────────────── */
type ChartType = "rulemap" | "flowchart" | "timeline";
type Node = { id?: string; label: string; kind?: string };
type Edge = { from: string; to: string; label?: string };
type ChartSpec = { nodes: Node[]; edges: Edge[]; chartType: ChartType };

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const asString = (v: unknown) => (typeof v === "string" ? v : "");

/* ── Small utils ─────────────────────────────────────────────────────────── */
function bad(status: number, error: string, extra?: unknown) {
  return Response.json({ error, ...(extra ? { details: extra } : {}) }, { status });
}

/* ── Deterministic fallback (works for any text) ─────────────────────────── */
function normalizeText(raw: string) {
  return raw.replace(/[—–]/g, "-").replace(/[⇒→]/g, "->").trim();
}
function extractNumberedEnum(s: string): string[] {
  const out: string[] = [];
  const re = /\(\s*\d+\s*\)\s*([^()]+?)(?=(?:\(\s*\d+\s*\)|[.;\n]|$))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) out.push(m[1].trim());
  return out.filter(Boolean);
}
function splitIntoSteps(text: string): string[] {
  const s = normalizeText(text);
  const arrows = s.split(/\s*(?:->|=>)\s*/g).map((t) => t.trim()).filter(Boolean);
  if (arrows.length > 1) return arrows;

  const nums = extractNumberedEnum(s);
  if (nums.length >= 2) return nums;

  // sentence-ish
  const sentences = s.split(/[.;\n]+/g).map((t) => t.trim()).filter(Boolean);
  if (sentences.length >= 2) return sentences;

  // last resort: commas
  const commas = s.split(/\s*,\s*/g).map((t) => t.trim()).filter(Boolean);
  return commas.length ? commas : [s];
}
function toSpecFlow(parts: string[], chartType: ChartType): ChartSpec {
  const nodes: Node[] = parts
    .slice(0, 25)
    .map((p, i) => ({ id: `n${i + 1}`, label: p.length > 80 ? p.slice(0, 77) + "…" : p }));
  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      from: nodes[i].id!,
      to: nodes[i + 1].id!,
      label: chartType === "timeline" ? "then" : "next",
    });
  }
  return { chartType, nodes, edges };
}

/* ── Spec → Mermaid (fallback renderer) ──────────────────────────────────── */
function specToMermaid(spec: ChartSpec): string {
  if (spec.chartType === "timeline") {
    const rows = spec.nodes.map((n) => "    " + n.label).join("\n");
    return "timeline\n    title Generated Timeline\n" + (rows || "    Start");
  }
  const lines: string[] = ["flowchart TD"];
  for (const n of spec.nodes) {
    const label = n.label.replace(/"/g, '\\"');
    lines.push("  " + n.id + '["' + label + '"]');
  }
  for (const e of spec.edges) {
    const lbl = e.label ? "|" + e.label.replace(/\|/g, "/") + "|" : "";
    lines.push("  " + e.from + " -->" + lbl + " " + e.to);
  }
  return lines.join("\n");
}

/* ── Mermaid helpers ─────────────────────────────────────────────────────── */
function extractMermaidBlock(s: string): string | null {
  const fence = s.match(/```mermaid\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  const m = s.match(/^\s*(flowchart|graph|timeline)\b[\s\S]*$/i);
  return m ? m[0].trim() : null;
}
function mermaidToSpec(code: string): ChartSpec {
  const isTimeline = /^timeline\b/i.test(code);
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (isTimeline) {
    const lines = code.split("\n").map((l) => l.trim());
    for (const line of lines.slice(1)) {
      if (!line || /^title\b/i.test(line)) continue;
      nodes.push({ id: "n" + (nodes.length + 1), label: line });
    }
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({ from: nodes[i].id!, to: nodes[i + 1].id!, label: "then" });
    }
    return { chartType: "timeline", nodes, edges };
  }

  // flowchart: id[label], id{label}, edges
  const idLabel = new Map<string, string>();
  code.split("\n").forEach((l) => {
    const n = l.match(/^\s*([a-zA-Z0-9_]+)\s*(?:\[\s*"?(.*?)"?\s*\]|\{\s*"?(.+?)"?\s*\})/);
    if (n) {
      const id = n[1];
      const lbl = (n[2] || n[3] || "").trim();
      if (id && lbl) idLabel.set(id, lbl);
    }
    const e = l.match(/^\s*([a-zA-Z0-9_]+)\s*-->(?:\|(.+?)\|)?\s*([a-zA-Z0-9_]+)/);
    if (e) edges.push({ from: e[1], to: e[3], label: e[2]?.trim() });
  });
  idLabel.forEach((label, id) => nodes.push({ id, label }));
  return { chartType: "flowchart", nodes, edges };
}

/* ── Generic hinting (prompt/param only) ─────────────────────────────────── */
function inferHint(paramType?: ChartType, promptText?: string): ChartType {
  if (paramType && ["flowchart", "rulemap", "timeline"].includes(paramType)) return paramType;
  const p = (promptText ?? "").toLowerCase();
  if (/\btimeline|chronolog|schedule/i.test(p)) return "timeline";
  return "flowchart";
}

/* ── LLM: ask for Mermaid directly (no domain-specific examples) ─────────── */
async function callGroqForMermaid(
  text: string,
  hint: ChartType,
  userPrompt?: string
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GROQ_MODEL || "llama-3.1-70b-versatile";

  // Generic, domain-agnostic instructions. No examples.
  const system =
    "You convert arbitrary text into a valid Mermaid diagram.\n" +
    "Return Mermaid code ONLY (prefer a ```mermaid code fence```). No commentary before or after.\n" +
    "Constraints:\n" +
    "- Keep labels concise (<= 80 chars), meaningful, and self-contained.\n" +
    "- Preserve logical items; do not split parenthetical phrases across multiple nodes.\n" +
    "- Use unambiguous, connected graphs (no orphan nodes).\n" +
    "- Default to " + (hint === "timeline" ? "timeline" : "flowchart TD") + " unless the user prompt clearly asks otherwise.\n" +
    "- For flowchart: use {text} for decisions and [text] for steps. Label edges where helpful (e.g., and/or/if).";

  const user =
    "HINT: " + hint +
    (userPrompt ? "\nPROMPT: " + userPrompt : "") +
    "\nTEXT:\n" + text.replace(/\s+/g, " ").trim() +
    "\n\nReturn Mermaid only.";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 1000,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as GroqResponse | null;
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const code = extractMermaidBlock(content);
  if (!code) return null;
  if (!/^(flowchart|graph|timeline)\b/i.test(code)) return null;
  return code;
}

/* ── Route ───────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return bad(400, "Content-Type must be application/json");

    const body = (await req.json().catch(() => null)) as
      | { text?: string; chartType?: ChartType; prompt?: string }
      | null;
    if (!body || typeof body !== "object") return bad(400, "Malformed JSON body");

    const text = asString(body.text);
    const hint = inferHint(body.chartType, body.prompt);
    const prompt = asString(body.prompt);

    if (text.trim().length < 5)
      return bad(400, "Missing or too-short 'text' (>=5 chars required)");

    // 1) LLM → Mermaid (generic)
    const mermaidLLM = await callGroqForMermaid(text, hint, prompt);
    if (mermaidLLM) {
      const spec = mermaidToSpec(mermaidLLM);
      return Response.json(
        { spec, mermaid: mermaidLLM, info: { usedPrompt: !!prompt, usedLLM: true, path: "llm-mermaid" } },
        { status: 200 }
      );
    }

    // 2) Fallback: deterministic (always works)
    const parts = splitIntoSteps(text);
    const spec = toSpecFlow(parts, hint);
    const mermaid = specToMermaid(spec);
    return Response.json(
      { spec, mermaid, info: { usedPrompt: !!prompt, usedLLM: !!process.env.GROQ_API_KEY, path: "fallback-spec2mermaid" } },
      { status: 200 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return bad(500, msg);
  }
}
