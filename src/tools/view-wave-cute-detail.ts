import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { getAppsSdkCompatibleHtml, baseURL } from "@/lib/apps-sdk-html";

// Define the schema for tool parameters
export const schema = {
  id: z
    .string()
    .min(1, "Wave Cute ID is required")
    .describe("The Wave Cute ID to display details for"),
};

// Define tool metadata
export const metadata: ToolMetadata = {
  name: "view_wave_cute_detail",
  description:
    "Display detailed information about a specific Wave Cute by ID from the Akindo API",
  annotations: {
    title: "View Wave Cute Detail",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
  _meta: {
    openai: {
      toolInvocation: {
        invoking: "Loading wave cute details",
        invoked: "Wave cute detail ready",
      },
      widgetAccessible: true,
      resultCanProduceWidget: true,
    },
  },
};

// Tool implementation
export default async function viewWaveCuteDetail({
  id,
}: InferSchema<typeof schema>) {


  try {
    const html = await getAppsSdkCompatibleHtml(
      baseURL,
      "/view-wave-cute-detail"
    );

    return {
      content: [
        {
          type: "text",
          text: `<html>${html}</html>`,
        },
      ],
      structuredContent: { id },
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
              debug: {
                waveCuteId: id,
              },
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

