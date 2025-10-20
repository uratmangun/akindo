import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { getAppsSdkCompatibleHtml, baseURL } from "@/lib/apps-sdk-html";

// Define the schema for tool parameters
export const schema = {
  mode: z
    .enum(["all", "single", "page"])
    .default("all")
    .describe("Fetch mode: 'all' for all pages, 'single' for first page only, 'page' for specific page"),
  page: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Specific page number to fetch (only used when mode is 'page')"),
  activeOnly: z
    .boolean()
    .default(true)
    .describe("Filter to only show items with activeWave set to true"),
};

// Define tool metadata
export const metadata = {
  name: "view_wave_cute",
  description: "Display Wave Cute data from Akindo API with pagination support in an interactive UI",
  annotations: {
    title: "View Akindo Wave Cute Data",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
  _meta: {
    openai: {
      toolInvocation: {
        invoking: "Loading wave cute data",
        invoked: "Wave cute viewer ready",
      },
      widgetAccessible: true,
      resultCanProduceWidget: true,
    },
  },
} as ToolMetadata;

// Tool implementation
export default async function viewWaveHacks({
  mode,
  page,
  activeOnly,
}: InferSchema<typeof schema>) {
  try {
    // Get the HTML for the view-wave-hacks page
    const html = await getAppsSdkCompatibleHtml(baseURL, "/view-wave-cute");

    // Return HTML with structured content containing the parameters
    return {
      content: [
        {
          type: "text",
          text: `<html>${html}</html>`,
        },
      ],
      structuredContent: { mode, page, activeOnly },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              error: errorMessage,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}
