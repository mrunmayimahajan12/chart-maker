"use client";

import { useEffect, useRef, useState } from "react";

export default function PromptModal({
  open,
  initialPrompt = "Make a clear flowchart from the highlighted legal text. Use concise node labels and directional edges.",
  loading = false,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialPrompt?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}) {
  const [value, setValue] = useState(initialPrompt);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initialPrompt);
      setTimeout(() => ref.current?.focus(), 0);
    }
  }, [open, initialPrompt]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold">Describe the chart you want</h3>
        <p className="mb-3 text-sm text-gray-600">
          Tip: be specific about chart type, node kinds, relationships (e.g., “rule map with elements, tests, exceptions”).
        </p>
        <textarea
          ref={ref}
          className="h-28 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 outline-none focus:border-gray-300"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g., Build a timeline of events with dates as labels and causal arrows."
          disabled={loading}
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(value.trim())}
            className="rounded-lg bg-black px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Creating…" : "Create chart"}
          </button>
        </div>
      </div>
    </div>
  );
}
