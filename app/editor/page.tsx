// "use client";

// import React, { Suspense, useState } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import dynamic from "next/dynamic";

// const Mermaid = dynamic(() => import("@/components/Mermaid"), { ssr: false });

// type ChartType = "flowchart" | "rulemap" | "timeline";

// export default function EditorPage() {
//   return (
//     <Suspense fallback={<main className="min-h-screen grid place-items-center text-slate-300">Loading…</main>}>
//       <EditorClient />
//     </Suspense>
//   );
// }

// function EditorClient() {
//   const search = useSearchParams();
//   const router = useRouter();

//   const chartType = (search.get("chartType") as ChartType) || "flowchart";
//   const [text, setText] = useState(decodeURIComponent(search.get("text") || ""));
//   const [prompt, setPrompt] = useState(
//   decodeURIComponent(search.get("prompt") ?? "")
//   );

//   const [mermaid, setMermaid] = useState<string>("");
//   const [apiInfo, setApiInfo] = useState<{ usedLLM?: boolean; usedPrompt?: boolean; path?: string } | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   async function generate() {
//     setError(null);
//     setMermaid("");
//     setLoading(true);
//     try {
//         const debugForceLLM =
//         typeof window !== "undefined" &&
//         new URLSearchParams(window.location.search).get("llm") === "1";

//       const res = await fetch("/api/chart", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ text, chartType, prompt, llmOnly: debugForceLLM }),
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data?.error || res.statusText);
//       setMermaid(String(data.mermaid || ""));
//       setApiInfo(data.info || null);
//     } catch (e: unknown) {
//       setError(e instanceof Error ? e.message : "Failed to generate chart");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <main className="min-h-screen bg-[#0b0f17] p-6 grid gap-4" style={{ gridTemplateRows: "auto 1fr" }}>
//       <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
//         <button onClick={() => router.back()} className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100">
//           ← Back
//         </button>
//         <h1 className="text-center text-slate-100 font-extrabold text-xl m-0">Chart Editor</h1>
//         <div />
//       </div>

//       <div className="grid gap-4 md:grid-cols-[minmax(280px,420px)_1fr] items-start">
//         {/* Left: prompt & text */}
//         <div className="grid gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-slate-100">
//           <label className="grid gap-1">
//             <span className="text-xs opacity-80">Prompt</span>
//             <input
//               value={prompt}
//               onChange={(e) => setPrompt(e.target.value)}
//               placeholder="Tell the model how to structure the chart…"
//               className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100"
//             />
//           </label>
//           <label className="grid gap-1">
//             <span className="text-xs opacity-80">Source text</span>
//             <textarea
//               value={text}
//               onChange={(e) => setText(e.target.value)}
//               rows={8}
//               className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100"
//             />
//           </label>
//           <button
//             onClick={generate}
//             disabled={loading || !text || text.trim().length < 5}
//             className={`px-3 py-2 rounded-lg font-bold border ${
//               loading ? "bg-sky-900" : "bg-sky-600 hover:bg-sky-500"
//             } border-sky-500 text-slate-100`}
//           >
//             {loading ? "Generating…" : "Generate"}
//           </button>

//           {apiInfo && (
//             <div className="text-xs text-slate-400">
//               Engine: <span className="font-semibold">{apiInfo.usedLLM ? "LLM → Mermaid" : "Fallback parser"}</span>
//               {apiInfo.path ? ` (${apiInfo.path})` : ""}
//             </div>
//           )}

//           {error && <div className="rounded-md bg-rose-900 text-rose-100 px-3 py-2">Error: {error}</div>}
//         </div>

//         {/* Right: Mermaid render + code */}
//         <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 min-h-[420px] text-slate-100">
//           {mermaid ? (
//             <>
//               <Mermaid code={mermaid} />
//               <div className="mt-4">
//                 <div className="text-xs opacity-70 mb-1">Mermaid code</div>
//                 <textarea
//                   value={mermaid}
//                   readOnly
//                   rows={8}
//                   className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 font-mono text-xs"
//                 />
//               </div>
//             </>
//           ) : (
//             <div className="h-full grid place-items-center text-slate-400 text-sm">
//               Enter a prompt and click <span className="font-semibold ml-1">Generate</span> to see your chart.
//             </div>
//           )}
//         </div>
//       </div>
//     </main>
//   );
// }



"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Mermaid = dynamic(() => import("@/components/Mermaid"), { ssr: false });

type ChartType = "flowchart" | "rulemap" | "timeline";

export default function EditorPage() {
  return (
    <Suspense fallback={<main className="min-h-screen grid place-items-center text-slate-300">Loading…</main>}>
      <EditorClient />
    </Suspense>
  );
}

function EditorClient() {
  const search = useSearchParams();
  const router = useRouter();

  const chartType = (search.get("chartType") as ChartType) || "flowchart";
  const [text, setText] = useState(decodeURIComponent(search.get("text") ?? ""));
  // IMPORTANT: no default prompt – user must type it
  const [prompt, setPrompt] = useState(decodeURIComponent(search.get("prompt") ?? ""));

  const [mermaid, setMermaid] = useState<string>("");
  const [apiInfo, setApiInfo] = useState<{ usedLLM?: boolean; usedPrompt?: boolean; path?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = !loading && text.trim().length >= 5 && prompt.trim().length > 0;

  async function generate() {
    setError(null);
    setMermaid("");
    setApiInfo(null);
    setLoading(true);
    try {
      // Optional debug: add &llm=1 to URL to force “use LLM or error”
      const llmOnly = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("llm") === "1";

      const res = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, chartType, prompt, llmOnly }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);
      setMermaid(String(data.mermaid || ""));
      setApiInfo(data.info || null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate chart");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0f17] p-6 grid gap-4" style={{ gridTemplateRows: "auto 1fr" }}>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <button onClick={() => router.back()} className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100">
          ← Back
        </button>
        <h1 className="text-center text-slate-100 font-extrabold text-xl m-0">Chart Editor</h1>
        <div />
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(280px,420px)_1fr] items-start">
        {/* Left: prompt & text */}
        <div className="grid gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-slate-100">
          <label className="grid gap-1">
            <span className="text-xs opacity-80">Prompt</span>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe exactly how to turn the text into a chart (your words are used verbatim)…"
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
            disabled={!canGenerate}
            className={`px-3 py-2 rounded-lg font-bold border ${
              loading ? "bg-sky-900" : canGenerate ? "bg-sky-600 hover:bg-sky-500" : "bg-slate-700"
            } border-sky-500 text-slate-100`}
          >
            {loading ? "Generating…" : "Generate"}
          </button>

          {apiInfo && (
            <div className="text-xs text-slate-400">
              Engine:{" "}
              <span className="font-semibold">
                {apiInfo.usedLLM ? "LLM → Mermaid" : "Fallback parser"}
              </span>
              {apiInfo.path ? ` (${apiInfo.path})` : ""}
            </div>
          )}

          {error && <div className="rounded-md bg-rose-900 text-rose-100 px-3 py-2">Error: {error}</div>}
        </div>

        {/* Right: Mermaid render + code */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 min-h-[420px] text-slate-100">
          {mermaid ? (
            <>
              <Mermaid code={mermaid} />
              <div className="mt-4">
                <div className="text-xs opacity-70 mb-1">Mermaid code</div>
                <textarea
                  value={mermaid}
                  readOnly
                  rows={8}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 font-mono text-xs"
                />
              </div>
            </>
          ) : (
            <div className="h-full grid place-items-center text-slate-400 text-sm">
              Enter a prompt and click <span className="font-semibold ml-1">Generate</span> to see your chart.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
