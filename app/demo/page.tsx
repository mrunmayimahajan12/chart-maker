"use client";

import dynamic from "next/dynamic";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

const HighlightSurface = dynamic(() => import("@/components/HighlightSurface"), { ssr: false });
const FloatingAction  = dynamic(() => import("@/components/FloatingAction"),  { ssr: false });

export default function DemoPage() {
  const [text, setText] = useState("");
  const [pos, setPos] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
  const [error, setError] = useState<string | null>(null);

  // you can change this later if you add other chart types
  const [chartType] = useState<"rulemap" | "flowchart" | "timeline">("flowchart");

  const router = useRouter();

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Highlight → Make Chart (Demo)</h1>

      {/* Demo text surface: highlight any part of these paragraphs */}
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

      {/* Floating action: navigates to the editor with prompt + highlighted text */}
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
          const url = `/editor?chartType=${encodeURIComponent(chartType)}&text=${encodeURIComponent(
            text
          )}&prompt=${encodeURIComponent(prompt)}`;
          router.push(url);
        }}
      />

      {error && (
        <div style={{ color: "#b91c1c", background: "#fee2e2", padding: 10, borderRadius: 8 }}>
          Error: {error}
        </div>
      )}
    </main>
  );
}
