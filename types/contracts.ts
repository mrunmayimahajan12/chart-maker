export type SelectionPayload = {
  text: string;
  spans?: { sourceId: string; page?: number; start?: number; end?: number }[];
  chartType?: "rulemap"|"flowchart"|"timeline"|"casetree";
  userPrompt?: string;
};

export type ChartSpec = {
  type: "rulemap"|"flowchart"|"timeline"|"casetree";
  meta?: { title?: string };
  nodes: {
    id: string; label: string;
    kind?: "rule"|"fact"|"holding"|"prong"|"decision";
    citations?: { source: string; page?: number; span?: [number, number] }[];
  }[];
  edges?: {
    id: string; from: string; to: string;
    label?: string; type?: "yes"|"no"|"requires"|"leads_to";
  }[];
};
