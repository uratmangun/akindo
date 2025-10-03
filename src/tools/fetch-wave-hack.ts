import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import ky from "ky";

// Define the schema for tool parameters
export const schema = {
  id: z.string().describe("The Wave Hack ID to fetch details for"),
};

// Define tool metadata
export const metadata: ToolMetadata = {
  name: "fetch_wave_hack",
  description: "Fetch detailed information about a specific Wave Hack by ID from Akindo API",
  annotations: {
    title: "Fetch Wave Hack Details",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

interface WaveHackDetailResponse {
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
export default async function fetchWaveHack({
  id,
}: InferSchema<typeof schema>) {
  try {
    if (!id) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: "Wave hack ID is required",
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    // Create ky instance with retry logic
    const api = ky.create({
      timeout: 30000,
      retry: {
        limit: 3,
        methods: ["get"],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
    });

    // Fetch wave hack details from Akindo API
    const waveHackUrl = `https://api.akindo.io/public/wave-hacks/${id}`;

    console.log(`Fetching wave hack details for ID: ${id}`);
    console.log(`URL: ${waveHackUrl}`);

    const response = await api.get(waveHackUrl).json<WaveHackDetailResponse>();

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
    // Handle different types of errors
    let errorMessage = "Unknown error occurred";

    if (error instanceof Error) {
      errorMessage = error.message;

      // Check if it's a network/HTTP error
      if (error.message.includes("404")) {
        errorMessage = "Wave hack not found";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timeout - the API is taking too long to respond";
      } else if (error.message.includes("network")) {
        errorMessage = "Network error - unable to reach the API";
      }
    }

    console.error("Error fetching wave hack details:", error);

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
                originalError:
                  error instanceof Error ? error.message : "Unknown error",
                waveHackId: id,
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

