import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import ky from "ky";

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
  name: "fetch_akindo_data",
  description: "Fetch Wave Cute data from Akindo API with pagination support",
  annotations: {
    title: "Fetch Akindo Wave Cute Data",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
} as ToolMetadata;

interface AkindoApiResponse {
  items: any[];
  meta: {
    totalPages: number;
    totalItems: number;
  };
}

class AkindoDataFetcher {
  private baseUrl: string;
  private api: typeof ky;

  constructor() {
    this.baseUrl = "https://api.akindo.io/public/wave-hacks";
    this.api = ky.create({
      timeout: 30000,
      retry: {
        limit: 3,
        methods: ["get"],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
    });
  }

  async fetchPage(page: number = 1): Promise<AkindoApiResponse> {
    try {
      const response = await this.api
        .get(this.baseUrl, {
          searchParams: { page: page.toString() },
        })
        .json<AkindoApiResponse>();

      return response;
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      throw error;
    }
  }

  async fetchAllPages(): Promise<any[]> {
    try {
      // Fetch first page to get pagination info
      const firstPageResponse = await this.fetchPage(1);
      const { totalPages, totalItems } = firstPageResponse.meta;

      console.log(`Total items: ${totalItems}, Pages: ${totalPages}`);

      // Collect all data starting with first page
      let allData = [...firstPageResponse.items];

      // Fetch remaining pages if any
      if (totalPages > 1) {
        const remainingPagePromises = [];
        for (let page = 2; page <= totalPages; page++) {
          remainingPagePromises.push(this.fetchPage(page));
        }

        const remainingPages = await Promise.all(remainingPagePromises);

        // Combine all data
        for (const pageResponse of remainingPages) {
          allData = allData.concat(pageResponse.items);
        }
      }

      console.log(`Fetched ${allData.length} total items`);
      return allData;
    } catch (error) {
      console.error("Error fetching all pages:", error);
      throw error;
    }
  }

  generateDataSummary(data: any[]): any {
    const activeWaveCutes = data.filter((item) => item.activeWave);
    const publicCutes = data.filter((item) => item.isPublic);
    const uniqueTokens = [
      ...new Set(
        data.map((item) => item.grantDenomination?.name).filter(Boolean)
      ),
    ];

    return {
      totalItems: data.length,
      activeWaveCutes: activeWaveCutes.length,
      publicCutes: publicCutes.length,
      uniqueTokens: uniqueTokens.length,
      tokens: uniqueTokens,
      averageBuildingDays:
        data.reduce((sum, item) => sum + (item.buildingDays || 0), 0) /
        data.length,
      averageJudgingDays:
        data.reduce((sum, item) => sum + (item.judgingDays || 0), 0) /
        data.length,
    };
  }
}

// Tool implementation
export default async function fetchAkindoData({
  mode,
  page,
  activeOnly,
}: InferSchema<typeof schema>) {
  try {
    const fetcher = new AkindoDataFetcher();

    let data: any;
    let summary: any;

    if (mode === "page" && page) {
      // Fetch specific page
      const response = await fetcher.fetchPage(page);
      data = response.items;
      
      // Filter for active waves if requested
      if (activeOnly) {
        data = data.filter((item: any) => item && item.activeWave);
      }
      
      summary = {
        page: page,
        totalPages: response.meta.totalPages,
        totalItems: response.meta.totalItems,
        itemsOnPage: response.items.length,
        filteredItems: data.length,
        activeOnly,
      };
    } else if (mode === "single") {
      // Fetch single page (first page only)
      const response = await fetcher.fetchPage(1);
      data = response.items;
      
      // Filter for active waves if requested
      if (activeOnly) {
        data = data.filter((item: any) => item && item.activeWave);
      }
      
      summary = {
        page: 1,
        totalPages: response.meta.totalPages,
        totalItems: response.meta.totalItems,
        itemsOnPage: response.items.length,
        filteredItems: data.length,
        activeOnly,
        dataSummary: fetcher.generateDataSummary(data),
      };
    } else {
      // Fetch all pages
      data = await fetcher.fetchAllPages();
      
      // Filter for active waves if requested
      if (activeOnly) {
        data = data.filter((item: any) => item && item.activeWave);
      }
      
      summary = fetcher.generateDataSummary(data);
      summary.activeOnly = activeOnly;
    }

    const result = {
      success: true,
      data,
      summary,
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

