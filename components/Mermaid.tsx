"use client";

import React, { useEffect, useId, useRef, useState } from "react";

export default function Mermaid({ code }: { code: string }) {
  const domId = useId().replace(/:/g, "_");
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        const mod = await import("mermaid");
        const mermaid = mod.default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "dark",
          flowchart: { htmlLabels: true, curve: "basis" },
        });
        const { svg } = await mermaid.render(domId, code);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Failed to render Mermaid.");
      }
    })();
    return () => {
      cancelled = true;
      if (ref.current) ref.current.innerHTML = "";
    };
  }, [code, domId]);

  if (err) {
    return (
      <div className="rounded-lg border border-rose-700 bg-rose-950 text-rose-100 p-3 text-sm">
        Mermaid render error: {err}
      </div>
    );
  }
  return <div ref={ref} className="overflow-auto" />;
}
