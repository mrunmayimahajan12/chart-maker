const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const system = `Output ONLY valid JSON matching ChartSpec.
5–15 nodes. Preserve citations like "(p. 214)" at node level.
Multi-factor tests → kind:"prong". No markdown, no prose.`;

export async function groqChartJSON(prompt: {
  text: string; chartType?: string; notes?: string;
}): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content:
`Text:\n${prompt.text}\n\nDesired chart type: ${prompt.chartType ?? "auto"}${prompt.notes ? `\nNotes: ${prompt.notes}` : ""}\nReturn ONLY JSON.` }
      ]
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
