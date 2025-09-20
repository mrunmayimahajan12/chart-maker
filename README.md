This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

# Chart Maker (TypeScript + Node.js)

Turn highlighted text into clean, editable flowcharts.  
Built with **TypeScript + Node.js** (Next.js App Router), **Mermaid**, and **Groq**.

**Live Demo:** `https://<your-vercel-url>`  
**GitHub Repo:** `https://github.com/<your-username>/<your-repo>`

> Replace the two links above before submitting.

---

##About

A feature demo for law students and note-takers: highlight text from notes → click **Make Chart** → land in an **Editor** where you enter a prompt and generate a **Mermaid** flowchart (and copy the Mermaid code if you want).

---

## Quick Start (Local)

```bash
# 1) Clone & install
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm i   # or: yarn / pnpm

# 2) Env vars (repo root)
# Create .env.local with the following:
# --------------------------------------------------
# Required for LLM paths (fallbacks still work without it)
GROQ_API_KEY=sk_********************************
# Optional (defaults to this model if unset)
GROQ_MODEL=llama-3.3-70b-versatile
# --------------------------------------------------

# 3) Run
npm run dev
# open http://localhost:3000/demo
```

---

## How to Use (UI / Workflow)

1. Go to **`/demo`**. This page contains a few sample texts.  
2. **Highlight** any portion of the text you want to convert into a chart.  
3. Click **Make Chart** → you will be taken to **`/editor`** with the highlighted text prefilled.  
4. In the **Prompt** field, write instructions for the model (e.g., “Make a flowchart with decision diamonds and labeled yes/no edges.”).  
5. Click **Generate**.  
6. The chart renders on the right. Below it, you’ll see the **Mermaid code** (read-only) which you can copy anywhere.  
7. The small **Engine** label shows which path generated the chart (LLM or fallback).  
8. Edit the prompt or the source text and click **Generate** again to iterate.

> The `/demo` page’s sample texts are only for demonstration—you can paste your own text into the **Editor** page as well.

---

## How it Works (LLM-first with graceful fallbacks)

When you click **Generate**:

1. **LLM → JSON Graph (preferred).**  
   The API asks the LLM for a typed graph (nodes + edges + decision types), then compiles it to Mermaid.
2. **LLM → Mermaid (secondary).**  
   If JSON isn’t returned, the API asks for Mermaid code and parses it back to a spec.
3. **Heuristic brancher.**  
   If LLM paths fail/unavailable, the API detects simple `If…`/negation patterns → decision nodes with yes/no edges.
4. **Linear fallback.**  
   Final safety net (sentences/arrows/numbered lists → linear flow), so you always get a chart.

The API returns:
```json
{
  "spec": { "chartType": "flowchart", "nodes": [...], "edges": [...] },
  "mermaid": "flowchart TD
 ...",
  "info": { "usedPrompt": true, "usedLLM": true, "path": "llm-json→compile" }
}
```

---

## Tech Stack (meets “TypeScript + Node.js”)

- **Language:** TypeScript  
- **Runtime:** **Node.js** serverless function (Next.js API route)  
  - See `app/api/chart/route.ts`:
    ```ts
    export const runtime = "nodejs";
    export const dynamic = "force-dynamic";
    ```
- **Framework:** Next.js (App Router)  
- **LLM:** Groq (server-side fetch from the Node API route)  
- **Viz:** Mermaid (client-side renderer)

---

## Project Structure (key parts)

```
app/
  demo/page.tsx          # highlight surface → opens editor with selected text
  editor/page.tsx        # prompt + text input, generate + render Mermaid
  api/chart/route.ts     # Node.js API route — LLM-first pipeline + fallbacks
components/
  Mermaid.tsx            # Mermaid renderer
  HighlightSurface.tsx   # selection/highlight helper for the demo page
```

---

## Configuration

| Env Var        | Required | Default                   | Notes                                  |
|----------------|----------|---------------------------|----------------------------------------|
| `GROQ_API_KEY` | ✅       | —                         | LLM engines need this                  |
| `GROQ_MODEL`   | ❌       | `llama-3.3-70b-versatile` | Can override with a supported model    |

> If the key/model is missing or rate-limited, the app still works via heuristic and linear fallbacks.

---


## Troubleshooting

- **Engine shows heuristic instead of LLM:**  
  Check `.env.local`/Vercel env; ensure the model is valid and you restarted the dev server after editing env.
- **LLM errors in logs:**  
  The app will fall back and keep working; set `llmOnly: true` in the request body if you want failures to surface for debugging.
- **Mermaid render issues:**  
  Try regenerating; ensure Mermaid code starts with `flowchart` or `timeline`.

---

