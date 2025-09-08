import { NextRequest, NextResponse } from 'next/server';
import ky from 'ky';

interface AkindoApiResponse {
  data: any[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

class AkindoDataFetcher {
  private baseUrl: string;
  private api: typeof ky;

  constructor() {
    this.baseUrl = 'https://api.akindo.io/public/wave-hacks';
    this.api = ky.create({
      timeout: 30000,
      retry: { 
        limit: 3, 
        methods: ['get'], 
        statusCodes: [408, 413, 429, 500, 502, 503, 504] 
      }
    });
  }

  async fetchPage(page: number = 1): Promise<AkindoApiResponse> {
    try {
      const response = await this.api.get(this.baseUrl, {
        searchParams: { page: page.toString() }
      }).json<AkindoApiResponse>();
      
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
      const { pageCount, total } = firstPageResponse.meta.pagination;
      
      console.log(`Total items: ${total}, Pages: ${pageCount}`);
      
      // Collect all data starting with first page
      let allData = [...firstPageResponse.data];
      
      // Fetch remaining pages if any
      if (pageCount > 1) {
        const remainingPagePromises = [];
        for (let page = 2; page <= pageCount; page++) {
          remainingPagePromises.push(this.fetchPage(page));
        }
        
        const remainingPages = await Promise.all(remainingPagePromises);
        
        // Combine all data
        for (const pageResponse of remainingPages) {
          allData = allData.concat(pageResponse.data);
        }
      }
      
      console.log(`Fetched ${allData.length} total items`);
      return allData;
    } catch (error) {
      console.error('Error fetching all pages:', error);
      throw error;
    }
  }

  generateDataSummary(data: any[]): any {
    const activeWaveHacks = data.filter(item => item.activeWave);
    const publicHacks = data.filter(item => item.isPublic);
    const uniqueTokens = [...new Set(data.map(item => item.grantDenomination?.name).filter(Boolean))];
    
    return {
      totalItems: data.length,
      activeWaveHacks: activeWaveHacks.length,
      publicHacks: publicHacks.length,
      uniqueTokens: uniqueTokens.length,
      tokens: uniqueTokens,
      averageBuildingDays: data.reduce((sum, item) => sum + (item.buildingDays || 0), 0) / data.length,
      averageJudgingDays: data.reduce((sum, item) => sum + (item.judgingDays || 0), 0) / data.length,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const single = searchParams.get('single') === 'true';
    const page = searchParams.get('page');
    
    const fetcher = new AkindoDataFetcher();
    
    let data: any;
    let summary: any;
    
    if (page && !single) {
      // Fetch specific page
      const pageNum = parseInt(page, 10);
      const response = await fetcher.fetchPage(pageNum);
      data = response.data;
      summary = {
        page: pageNum,
        pageSize: response.meta.pagination.pageSize,
        pageCount: response.meta.pagination.pageCount,
        total: response.meta.pagination.total,
        itemsOnPage: response.data.length
      };
    } else if (single) {
      // Fetch single page (first page only)
      const response = await fetcher.fetchPage(1);
      data = response.data;
      summary = {
        page: 1,
        pageSize: response.meta.pagination.pageSize,
        pageCount: response.meta.pagination.pageCount,
        total: response.meta.pagination.total,
        itemsOnPage: response.data.length,
        dataSummary: fetcher.generateDataSummary(response.data)
      };
    } else {
      // Fetch all pages
      data = await fetcher.fetchAllPages();
      summary = fetcher.generateDataSummary(data);
    }
    
    return NextResponse.json({
      success: true,
      data,
      summary,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
