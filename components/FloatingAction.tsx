"use client";

export default function FloatingAction({
  show, x, y, onClick,
}: { show: boolean; x: number; y: number; onClick: () => void }) {
  if (!show) return null;
  return (
    <button
      onClick={onClick}
      className="fixed z-50 rounded bg-black px-3 py-2 text-white shadow"
      style={{ left: x, top: y }}
    >
      Make Chart
    </button>
  );
}
