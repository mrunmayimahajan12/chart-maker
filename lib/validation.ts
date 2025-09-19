import { z } from "zod";

//zod schemas for validating input and output data

export const SelectionPayloadSchema = z.object({
  text: z.string().min(1),
  spans: z.array(z.object({
    sourceId: z.string(),
    page: z.number().optional(),
    start: z.number().optional(),
    end: z.number().optional(),
  })).optional(),
  chartType: z.enum(["rulemap","flowchart","timeline","casetree"]).optional(),
  userPrompt: z.string().optional(),
});

export const ChartSpecSchema = z.object({
  type: z.enum(["rulemap","flowchart","timeline","casetree"]),
  meta: z.object({ title: z.string().optional() }).optional(),
  nodes: z.array(z.object({
    id: z.string(),
    label: z.string().min(1),
    kind: z.enum(["rule","fact","holding","prong","decision"]).optional(),
    citations: z.array(z.object({
      source: z.string(),
      page: z.number().optional(),
      span: z.tuple([z.number(), z.number()]).optional(),
    })).optional(),
  })).min(5),
  edges: z.array(z.object({
    id: z.string(),
    from: z.string(),
    to: z.string(),
    label: z.string().optional(),
    type: z.enum(["yes","no","requires","leads_to"]).optional(),
  })).optional(),
});
