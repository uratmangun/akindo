import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import ky from "ky";

// Define the schema for tool parameters
export const schema = {
  id: z
    .string()
    .min(1, "Wave Cute ID is required")
    .describe("The Wave Cute ID to fetch details for"),
};

// Define tool metadata
export const metadata: ToolMetadata = {
  name: "fetch_wave_cute",
  description:
    "Fetch detailed information about a specific Wave Cute by ID from the Akindo API",
  annotations: {
    title: "Fetch Wave Cute Details",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

interface WaveCuteDetailResponse {
  id: string;
  title: string;
  description: string;
  community: {
    websiteUrl?: string;
    discordUrl?: string;
    twitterUrl?: string;
    telegramUrl?: string;
  };
  criteria: Array<{
    id: string;
    title: string;
    sort: number;
    isActive: boolean;
  }>;
}

// Tool implementation
export default async function fetchWaveCute({
  id,
}: InferSchema<typeof schema>) {
  if (!id) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              error: "Wave Cute ID is required",
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

  try {
    const api = ky.create({
      timeout: 30000,
      retry: {
        limit: 3,
        methods: ["get"],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
    });

    const waveCuteUrl = `https://api.akindo.io/public/wave-hacks/${id}`;
    console.log(`Fetching wave cute details for ID: ${id}`);
    console.log(`URL: ${waveCuteUrl}`);

    const response = await api.get(waveCuteUrl).json<WaveCuteDetailResponse>();

    console.log("API response received:", {
      id: response.id,
      title: response.title,
      hasDescription: !!response.description,
      hasCommunity: !!response.community,
      criteriaCount: response.criteria?.length || 0,
    });

    const result = {
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    let errorMessage = "Unknown error occurred";

    if (error instanceof Error) {
      errorMessage = error.message;

      if (error.message.includes("404")) {
        errorMessage = "Wave Cute not found";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timeout - the API is taking too long to respond";
      } else if (error.message.includes("network")) {
        errorMessage = "Network error - unable to reach the API";
      }
    }

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
