import { NextRequest } from "next/server";

type ChartType = "rulemap" | "flowchart" | "timeline";
type Node = { id: string; label: string; kind?: string };
type Edge = { from: string; to: string; label?: string };
type ChartSpec = { nodes: Node[]; edges: Edge[]; chartType: ChartType };

function bad(status: number, error: string, extra?: unknown) {
  return Response.json({ error, ...(extra ? { details: extra } : {}) }, { status });
}

/** Normalize arrows/dashes and strip context prefixes like "In negligence, ..." */
function normalizeText(raw: string) {
  let s = raw.replace(/[—–]/g, "-").replace(/[⇒→]/g, "->").trim();
  s = s.replace(/^\s*(?:in|under)\s+[^,]+,\s*/i, ""); // drop leading context
  return s;
}

function extractNumberedEnum(s: string): string[] {
  // Matches: (1) itemA, (2) itemB, (3) itemC ...
  const items: string[] = [];
  const re = /\(\s*\d+\s*\)\s*([^()]+?)(?=(?:\(\s*\d+\s*\)|[.;\n]|$))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const item = m[1].trim().replace(/^[,:-]\s*/, "").replace(/\s+(?:and|or)\s*$/, "");
    if (item) items.push(item);
  }
  return items;
}

function extractCommaAndList(s: string): string[] {
  // Matches: X, Y, Z, and W  (generic, not hard-coded to negligence)
  const m = s.match(/([A-Za-z][\w -]*?(?:,\s*[A-Za-z][\w -]*){2,})\s*,?\s*(?:and\s+([A-Za-z][\w -]*))/i);
  if (!m) return [];
  const head = m[1];
  const last = m[2];
  const parts = head.split(/\s*,\s*/).map(t => t.trim()).filter(Boolean);
  if (last) parts.push(last.trim());
  // sanity check: looks like a short list of items (not full sentences)
  if (parts.length >= 3 && parts.every(p => p.length <= 60 && !/[.;]/.test(p))) return parts;
  return [];
}

function splitIntoSteps(text: string): string[] {
  const s = normalizeText(text);

  // 1) Arrow chains: A -> B -> C
  const arrowParts = s.split(/\s*(?:->|=>)\s*/g).map(x => x.trim()).filter(Boolean);
  if (arrowParts.length > 1) return arrowParts;

  // 2) Numbered enumerations: (1) A, (2) B, ...
  const numEnum = extractNumberedEnum(s);
  if (numEnum.length >= 2) return numEnum;

  // 3) Parenthesized lists: (..., ..., ...) — e.g., factors inside parentheses
  const parenMatch = s.match(/\(([^()]+)\)/);
  if (parenMatch) {
    const parts = parenMatch[1].split(/\s*,\s*/).map(x => x.trim()).filter(Boolean);
    if (parts.length >= 2 && parts.every(p => p.length <= 60)) return parts;
  }

  // 4) Comma + 'and' lists: X, Y, Z, and W
  const commaAnd = extractCommaAndList(s);
  if (commaAnd.length >= 3) return commaAnd;

  // 5) Plain short comma-lists
  const commaParts = s.split(/\s*,\s*/g).map(x => x.trim()).filter(Boolean);
  if (commaParts.length >= 2 && commaParts.every(p => p.length <= 60)) return commaParts;

  // 6) Fallback: sentences/lines
  const sentenceParts = s.split(/[.;\n]+/g).map(x => x.trim()).filter(Boolean);
  return sentenceParts.length ? sentenceParts : [s];
}

/** Split into ordered steps (arrows > comma-lists > sentences/lines) */
// function splitIntoSteps(text: string): string[] {
//   const s = normalizeText(text);

//   const arrowParts = s.split(/\s*(?:->|=>)\s*/g).map(x => x.trim()).filter(Boolean);
//   if (arrowParts.length > 1) return arrowParts;

//   const commaParts = s.split(/\s*,\s*/g).map(x => x.trim()).filter(Boolean);
//   if (commaParts.length >= 2 && commaParts.every(p => p.length <= 60)) return commaParts;

//   const sentenceParts = s.split(/[.;\n]+/g).map(x => x.trim()).filter(Boolean);
//   return sentenceParts.length ? sentenceParts : [s];
// }

function toSpecFlow(parts: string[], chartType: ChartType): ChartSpec {
  const capped = parts.slice(0, 25);
  const nodes: Node[] = capped.map((p, i) => ({
    id: `n${i + 1}`,
    label: p.length > 80 ? p.slice(0, 77) + "…" : p,
    ...(chartType === "flowchart" && /\b(if|whether|must|test|require)\b/i.test(p)
      ? { kind: "decision" as const }
      : {}),
  }));

  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ from: nodes[i].id, to: nodes[i + 1].id, label: chartType === "timeline" ? "then" : "next" });
  }

  return { chartType, nodes, edges };
}

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return bad(400, "Content-Type must be application/json");

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return bad(400, "Malformed JSON body");

    const { text, chartType = "flowchart", prompt } = body as {
      text?: string;
      chartType?: ChartType;
      prompt?: string;
    };

    if (typeof text !== "string" || text.trim().length < 5) {
      return bad(400, "Missing or too-short 'text' (>=5 chars required)");
    }
    if (!["rulemap", "flowchart", "timeline"].includes(chartType)) {
      return bad(400, "Invalid 'chartType'. Use 'rulemap' | 'flowchart' | 'timeline'");
    }
    if (prompt && typeof prompt !== "string") return bad(400, "'prompt' must be a string if provided");

    const parts = splitIntoSteps(text);
    const spec = toSpecFlow(parts, chartType as ChartType);

    return Response.json({ spec, info: { usedPrompt: !!prompt } }, { status: 200 });
  } catch (err) {
    console.error("POST /api/chart error:", err);
    return bad(500, "Internal server error");
  }
}

